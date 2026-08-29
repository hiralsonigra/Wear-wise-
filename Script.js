const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ============================================================
   PRODUCT DATA (deterministic — same id always gives the same
   price/stock/rating, so the cart, product view and grid never
   disagree with each other, even after a reload)
   ============================================================ */
const categories = [
  ["Women","Women's Fashion"],
  ["Men","Men's Fashion"],
  ["Dresses","Luxury Dresses"],
  ["Shoes","Premium Shoes"],
  ["Bags","Designer Bags"],
  ["Accessories","Fashion Accessories"]
];

const images = {
  Women:[
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b",
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b"
  ],
  Men:[
    "https://images.unsplash.com/photo-1516826957135-700dedea698c",
    "https://images.unsplash.com/photo-1617137968427-85924c800a22",
    "https://images.unsplash.com/photo-1610652492500-ded49ceeb378"
  ],
  Dresses:[
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8",
    "https://images.unsplash.com/photo-1566174053879-31528523f8ae",
    "https://images.unsplash.com/photo-1539008835657-9e8e9680c956"
  ],
  Shoes:[
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772"
  ],
  Bags:[
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3",
    "https://images.unsplash.com/photo-1594223274512-ad4803739b7c",
    "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d"
  ],
  Accessories:[
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49",
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a",
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338"
  ]
};

function hashSeed(str){
  let h = 0;
  for(let i=0;i<str.length;i++) h = (Math.imul(31,h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}
function seededRand(seed){
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rand(id, salt){ return seededRand(hashSeed(id) + salt); }

const reviewerNames = ["Aisha K.","Rohan M.","Priya S.","Karan V.","Neha T.","Dev A.","Simran G.","Arjun P.","Meera J.","Vikram R."];
const reviewTemplates = [
  "Fit is exactly as described, and the fabric feels far sturdier than the price suggests.",
  "Shipping was quick and the packaging felt premium. Would order again.",
  "Runs slightly true to size. I'd still recommend sizing up if you're between sizes.",
  "The color in person is richer than the photos show — genuinely happy with this pick.",
  "Good everyday piece, holds up well after a few washes.",
  "Not quite what I expected from the photos, but the quality is solid.",
  "This has become a staple in my rotation. Simple, well-made, no complaints.",
  "Great value for the price point. Stitching is clean and consistent."
];

const products = [];
categories.forEach(([cat,title])=>{
  for(let i=1;i<=50;i++){
    const id = `${cat}-${i}`;
    const price = Math.floor(1500 + rand(id,1)*7500);
    const oldPrice = Math.floor(price*1.35 + rand(id,2)*2000);
    const rating = (4 + rand(id,3)).toFixed(1);
    const stock = Math.floor(rand(id,4)*25);

    const reviewCount = 3 + Math.floor(rand(id,5)*3);
    const reviews = [];
    for(let r=0;r<reviewCount;r++){
      reviews.push({
        name: reviewerNames[Math.floor(rand(id,10+r)*reviewerNames.length)],
        rating: Math.max(3, Math.min(5, Math.round(4 + rand(id,20+r)*1.4))),
        text: reviewTemplates[Math.floor(rand(id,30+r)*reviewTemplates.length)]
      });
    }

    products.push({
      id, category:cat,
      name:`${title} ${String(i).padStart(2,"0")}`,
      price, oldPrice, rating, stock, reviews,
      image:images[cat][(i-1)%3] + "?auto=format&fit=crop&w=700&q=85",
      gallery:[0,1,2].map(k=>images[cat][k]+"?auto=format&fit=crop&w=900&q=90"),
      sizes:["XS","S","M","L","XL"],
      colors:["Black","White","Cream","Gold"]
    });
  }
});
function getProduct(id){ return products.find(p=>p.id===id); }

/* ============================================================
   STATE
   ============================================================ */
let cart = JSON.parse(localStorage.getItem("wearwiseCart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("wearwiseWishlist") || "[]");
let currentCategory = "All";
let showWishlistOnly = false;
let visibleCount = 12;
let discount = 0;
let viewerAngle = 0;
let pendingAnchor = null;

function save(){
  localStorage.setItem("wearwiseCart", JSON.stringify(cart));
  localStorage.setItem("wearwiseWishlist", JSON.stringify(wishlist));
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("wearwiseTheme", theme);
  const btn = $("#themeToggle");
  if(btn) btn.textContent = theme==="dark" ? "☀" : "☾";
}
applyTheme(localStorage.getItem("wearwiseTheme") || "light");
$("#themeToggle")?.addEventListener("click",()=>{
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current==="dark" ? "light" : "dark");
});

/* ============================================================
   ROUTER (single-page: home / product / policies / orders)
   ============================================================ */
function showView(name){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#view-"+name)?.classList.add("active");
}

function router(){
  const hash = location.hash || "#/";
  const [rawPath, query] = hash.slice(1).split("?");
  const path = rawPath || "/";

  if(path==="/product"){
    showView("product");
    renderProductView(new URLSearchParams(query||"").get("id"));
  }else if(path==="/policies"){
    showView("policies");
  }else if(path==="/orders"){
    showView("orders");
    renderOrdersView();
  }else{
    showView("home");
  }

  window.scrollTo({top:0, behavior:"instant"});

  if(pendingAnchor){
    const target = document.getElementById(pendingAnchor);
    if(target) setTimeout(()=>target.scrollIntoView({behavior:"smooth"}), 60);
    pendingAnchor = null;
  }
}

/* Navigate programmatically. Sets the hash for bookmarking/back-button
   support AND calls router() synchronously right away — this makes the
   view switch instant instead of waiting on the async hashchange event,
   so any code that runs right after navigate() (e.g. a scrollIntoView)
   always sees the correct view already visible. */
function navigate(hash){
  if(location.hash !== hash) location.hash = hash;
  router();
}

window.addEventListener("hashchange", router);

/* Any element with data-nav goes to a view; data-anchor scrolls once there */
$$("[data-nav]").forEach(el=>{
  el.addEventListener("click",e=>{
    if(el.dataset.anchor) pendingAnchor = el.dataset.anchor;
  });
});

/* ============================================================
   LOADER
   ============================================================ */
window.addEventListener("load",()=>{
  const loader=$("#pageLoader");
  if(loader){
    loader.classList.add("hidden");
    setTimeout(()=>loader.style.display="none",500);
  }
});

/* ============================================================
   RECENTLY VIEWED
   ============================================================ */
function trackRecentlyViewed(id){
  let recent = JSON.parse(localStorage.getItem("wearwiseRecentlyViewed") || "[]");
  recent = recent.filter(x=>x!==id);
  recent.unshift(id);
  recent = recent.slice(0,8);
  localStorage.setItem("wearwiseRecentlyViewed", JSON.stringify(recent));
}

function renderRecentlyViewed(sectionEl, gridEl, excludeId){
  if(!sectionEl || !gridEl) return;
  const recent = JSON.parse(localStorage.getItem("wearwiseRecentlyViewed") || "[]")
    .filter(id=>id!==excludeId)
    .map(id=>getProduct(id)).filter(Boolean);

  if(!recent.length){ sectionEl.style.display="none"; return; }
  sectionEl.style.display="";
  gridEl.innerHTML = recent.map(p=>productCard(p.id)).join("");
  wireProductCardEvents(gridEl);
}
function refreshHomeRecentlyViewed(){
  renderRecentlyViewed($("#recentlyViewedSection"), $("#recentlyViewedGrid"));
}

/* ============================================================
   PRODUCT GRID (home)
   ============================================================ */
function renderProducts(){
  let list;

  if(showWishlistOnly){
    list = products.filter(p=>wishlist.includes(p.id));
  }else{
    list = products.filter(p=>{
      const search=($("#searchInput")?.value || "").toLowerCase();
      const max=Number($("#priceRange")?.value || 10000);
      return(
        (currentCategory==="All" || p.category===currentCategory) &&
        p.name.toLowerCase().includes(search) &&
        p.price<=max
      );
    });

    const sort=$("#sortSelect")?.value;
    if(sort==="price-low") list.sort((a,b)=>a.price-b.price);
    if(sort==="price-high") list.sort((a,b)=>b.price-a.price);
    if(sort==="rating") list.sort((a,b)=>b.rating-a.rating);
    if(sort==="newest") list.reverse();
  }

  const grid=$("#productGrid");
  if(!grid)return;

  grid.innerHTML = list.length
    ? list.slice(0,visibleCount).map(p=>productCard(p.id)).join("")
    : "<p class='empty'>No products match your filters.</p>";

  if($("#loadMoreBtn")) $("#loadMoreBtn").style.display =
    (showWishlistOnly || visibleCount>=list.length) ? "none" : "";

  wireProductCardEvents(grid);
}

function wireProductCardEvents(container){
  container.querySelectorAll(".product-card").forEach(card=>{
    card.addEventListener("click",e=>{
      if(e.target.closest(".wish-btn"))return;
      if(e.target.closest(".add-btn"))return;
      openProduct(card.dataset.id);
    });
  });
  container.querySelectorAll(".wish-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      toggleWishlist(btn.dataset.id);
    });
  });
  container.querySelectorAll(".add-btn").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      if(btn.disabled) return;
      addCart(btn.dataset.id);
    });
  });
}

function productCard(id){
  const p=getProduct(id);
  if(!p) return "";
  const liked=wishlist.includes(p.id);
  const off=Math.round((1-p.price/p.oldPrice)*100);
  const outOfStock = p.stock<=0;
  const lowStock = p.stock>0 && p.stock<5;

  return`
  <article class="product-card" data-id="${p.id}">
    <div class="product-image">
      <img src="${p.image}" loading="lazy"
       onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80'">
      <button class="wish-btn" data-id="${p.id}" aria-label="Toggle wishlist">${liked?"♥":"♡"}</button>
      <span class="discount">${off}% OFF</span>
      ${lowStock ? `<span class="stock-flag">Only ${p.stock} left</span>` : ""}
      ${outOfStock ? `<span class="stock-flag out">Out of stock</span>` : ""}
      <button class="add-btn" data-id="${p.id}" ${outOfStock?"disabled":""}>
        ${outOfStock ? "OUT OF STOCK" : "ADD TO CART"}
      </button>
    </div>
    <div class="product-info">
      <small>${p.category}</small>
      <h3>${p.name}</h3>
      <div>★ ${p.rating} <span class="review-count">(${p.reviews.length})</span></div>
      <strong>₹${p.price.toLocaleString()}</strong>
      <del>₹${p.oldPrice.toLocaleString()}</del>
    </div>
  </article>`;
}

/* FILTERS */
$("#searchInput")?.addEventListener("input",()=>{ visibleCount=12; renderProducts(); });
$("#sortSelect")?.addEventListener("change",renderProducts);
$("#priceRange")?.addEventListener("input",e=>{
  if($("#priceValue")) $("#priceValue").textContent="₹"+Number(e.target.value).toLocaleString();
  visibleCount=12;
  renderProducts();
});
$("#resetFilters")?.addEventListener("click",()=>{
  currentCategory="All";
  showWishlistOnly=false;
  visibleCount=12;
  if($("#searchInput"))$("#searchInput").value="";
  if($("#priceRange"))$("#priceRange").value=10000;
  if($("#priceValue"))$("#priceValue").textContent="₹10,000";
  if($("#sortSelect"))$("#sortSelect").value="featured";
  if($("#shopHeading"))$("#shopHeading").textContent="New Arrivals";
  renderProducts();
});

/* CATEGORY (nav links, footer links, category cards) */
$$(".category-card, .cat-link").forEach(card=>{
  card.addEventListener("click",e=>{
    e.preventDefault();
    currentCategory=card.dataset.category;
    showWishlistOnly=false;
    visibleCount=12;
    if($("#shopHeading"))$("#shopHeading").textContent=currentCategory;
    navigate("#/");
    setTimeout(()=>{
      renderProducts();
      $("#new-arrivals")?.scrollIntoView({behavior:"smooth"});
    },0);
  });
});

$("#loadMoreBtn")?.addEventListener("click",()=>{
  visibleCount+=12;
  renderProducts();
});

/* ============================================================
   CART
   ============================================================ */
function addCart(id){
  const item=cart.find(x=>x.id===id);
  if(item)item.qty++;
  else cart.push({id, qty:1, size:"M", color:"Black"});
  save();
  renderCart();
  toast("Added to cart ✓");
}
function removeCart(id){
  cart=cart.filter(x=>x.id!==id);
  save();
  renderCart();
}
function changeQty(id,value){
  const item=cart.find(x=>x.id===id);
  if(!item)return;
  item.qty+=value;
  if(item.qty<=0)removeCart(id);
  else{ save(); renderCart(); }
}

function renderCart(){
  const box=$("#cartItems");
  if(!box)return;

  box.innerHTML=cart.length
  ?cart.map(item=>{
    const p=getProduct(item.id);
    if(!p) return "";
    return`
    <div class="cart-item">
      <img src="${p.image}">
      <div>
        <h4>${p.name}</h4>
        <p>Size: ${item.size} · ${item.color}</p>
        <strong>₹${p.price.toLocaleString()}</strong>
        <div class="qty">
          <button onclick="changeQty('${p.id}',-1)" aria-label="Decrease quantity">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${p.id}',1)" aria-label="Increase quantity">+</button>
          <button onclick="removeCart('${p.id}')">Remove</button>
        </div>
      </div>
    </div>`;
  }).join("")
  :"<p class='empty'>Your cart is empty.</p>";

  let subtotal=cart.reduce((sum,item)=>{
    const p=getProduct(item.id);
    return p ? sum+p.price*item.qty : sum;
  },0);
  const disc=subtotal*discount;
  const total=subtotal-disc;

  if($("#cartSubtotal")) $("#cartSubtotal").textContent="₹"+subtotal.toLocaleString();
  if($("#cartDiscount")) $("#cartDiscount").textContent="₹"+Math.round(disc).toLocaleString();
  if($("#cartTotal")) $("#cartTotal").textContent="₹"+Math.round(total).toLocaleString();
  if($("#cartCount")) $("#cartCount").textContent=cart.reduce((a,b)=>a+b.qty,0);
}

$("#cartOpenBtn")?.addEventListener("click",()=>{
  $("#cartDrawer")?.classList.add("open");
  $("#cartOverlay")?.classList.add("show");
});
$("#cartCloseBtn")?.addEventListener("click",closeCart);
$("#cartOverlay")?.addEventListener("click",closeCart);
function closeCart(){
  $("#cartDrawer")?.classList.remove("open");
  $("#cartOverlay")?.classList.remove("show");
}

/* ============================================================
   WISHLIST
   ============================================================ */
function toggleWishlist(id){
  if(wishlist.includes(id)){
    wishlist=wishlist.filter(x=>x!==id);
    toast("Removed from wishlist");
  }else{
    wishlist.push(id);
    toast("Added to wishlist ♥");
  }
  save();
  renderProducts();
  if($("#wishlistCount")) $("#wishlistCount").textContent=wishlist.length;
}

$("#wishlistNavBtn")?.addEventListener("click",()=>{
  showWishlistOnly=true;
  visibleCount=48;
  if($("#shopHeading"))$("#shopHeading").textContent="Your Wishlist";
  navigate("#/");
  setTimeout(()=>{
    renderProducts();
    $("#new-arrivals")?.scrollIntoView({behavior:"smooth"});
  },0);
});

/* ============================================================
   QUICK VIEW MODAL
   ============================================================ */
function openProduct(id){
  const p=getProduct(id);
  if(!p)return;

  trackRecentlyViewed(id);
  refreshHomeRecentlyViewed();

  const outOfStock = p.stock<=0;
  const stockLine = outOfStock
    ? `<div class="stock-line out">Out of stock</div>`
    : p.stock<5
      ? `<div class="stock-line low">Only ${p.stock} left in stock</div>`
      : `<div class="stock-line ok">In stock</div>`;

  $("#quickViewContent").innerHTML=`
    <div class="quick-product">
      <img src="${p.image}"
       onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80'">
      <div>
        <small>${p.category}</small>
        <h2>${p.name}</h2>
        <div>★ ${p.rating} <span class="review-count">(${p.reviews.length} reviews)</span></div>
        <h3>₹${p.price.toLocaleString()} <del>₹${p.oldPrice.toLocaleString()}</del></h3>
        ${stockLine}

        <label>Size</label>
        <select id="productSize" ${outOfStock?"disabled":""}>
          ${p.sizes.map(s=>`<option>${s}</option>`).join("")}
        </select>

        <label>Color</label>
        <select id="productColor" ${outOfStock?"disabled":""}>
          ${p.colors.map(c=>`<option>${c}</option>`).join("")}
        </select>

        <button class="primary-btn" id="quickAdd" ${outOfStock?"disabled":""}>
          ${outOfStock ? "OUT OF STOCK" : "ADD TO CART"}
        </button>
        <button class="secondary-btn" id="quickWish">
          ${wishlist.includes(p.id) ? "♥ IN WISHLIST" : "♡ WISHLIST"}
        </button>
        <a class="text-link" id="quickFullDetails" href="#/product?id=${encodeURIComponent(p.id)}">View full details, reviews &amp; size guide →</a>
      </div>
    </div>`;

  $("#productModal")?.classList.add("show");

  if(!outOfStock){
    $("#quickAdd").onclick=()=>{
      const size=$("#productSize").value;
      const color=$("#productColor").value;
      const item=cart.find(x=>x.id===id);
      if(item){ item.qty++; item.size=size; item.color=color; }
      else{ cart.push({id,qty:1,size,color}); }
      save(); renderCart(); closeProduct();
      toast("Product added ✓");
    };
  }

  $("#quickWish").onclick=()=>{ toggleWishlist(id); closeProduct(); };
  $("#quickFullDetails").onclick=closeProduct;
}
function closeProduct(){ $("#productModal")?.classList.remove("show"); }
$$("[data-close-product]").forEach(b=>b.onclick=closeProduct);

/* ============================================================
   SEARCH MODAL
   ============================================================ */
$("#searchOpenBtn")?.addEventListener("click",()=>{
  $("#searchOverlay")?.classList.add("show");
  setTimeout(()=>$("#searchInputModal")?.focus(),50);
});
$$("[data-close-search]").forEach(b=>{
  b.onclick=()=>$("#searchOverlay")?.classList.remove("show");
});
$("#searchInputModal")?.addEventListener("input",e=>{
  const q=e.target.value.toLowerCase();
  if(!q){ $("#searchSuggestions").innerHTML=""; return; }

  const matches = products.filter(p=>p.name.toLowerCase().includes(q)).slice(0,8);
  $("#searchSuggestions").innerHTML = matches.length
    ? matches.map(p=>`
      <div class="search-result" data-id="${p.id}">
        <img src="${p.image}"><span>${p.name}</span>
      </div>`).join("")
    : "<p class='empty'>No products found.</p>";

  $$(".search-result").forEach(el=>{
    el.addEventListener("click",()=>{
      $("#searchOverlay")?.classList.remove("show");
      openProduct(el.dataset.id);
    });
  });
});

/* ============================================================
   360 VIEWER
   ============================================================ */
function updateViewer(){
  const img=$("#viewerImage");
  if(!img)return;
  const list=images.Women;
  const index=Math.abs(Math.round(viewerAngle/120))%list.length;
  img.src=list[index]+"?auto=format&fit=crop&w=900&q=90";
  img.style.transform=`rotateY(${viewerAngle/3}deg) scale(1.03)`;
}
$("#rotateLeft")?.addEventListener("click",()=>{ viewerAngle-=120; updateViewer(); });
$("#rotateRight")?.addEventListener("click",()=>{ viewerAngle+=120; updateViewer(); });

function open360(){
  let modal=document.createElement("div");
  modal.className="modal-overlay show";
  modal.id="viewer360Modal";
  modal.innerHTML=`
    <div class="viewer360-box">
      <button class="modal-close" id="close360">×</button>
      <span>360° PRODUCT VIEW</span>
      <img id="full360Image" src="${images.Women[0]}?auto=format&fit=crop&w=1200&q=90">
      <p>Drag / Swipe to rotate</p>
    </div>`;
  document.body.appendChild(modal);
  $("#close360").onclick=()=>modal.remove();
  modal.addEventListener("click",e=>{ if(e.target===modal) modal.remove(); });

  const image=$("#full360Image");
  let down=false,lastX=0;
  function move(x){
    if(!down)return;
    const diff=x-lastX;
    if(Math.abs(diff)>5){
      viewerAngle+=diff>0?15:-15;
      const index=Math.abs(Math.round(viewerAngle/60))%3;
      image.src=images.Women[index]+"?auto=format&fit=crop&w=1200&q=90";
      lastX=x;
    }
  }
  image.addEventListener("mousedown",e=>{ down=true; lastX=e.clientX; });
  window.addEventListener("mousemove",e=>move(e.clientX));
  window.addEventListener("mouseup",()=>down=false);
  image.addEventListener("touchstart",e=>{ down=true; lastX=e.touches[0].clientX; });
  image.addEventListener("touchmove",e=>move(e.touches[0].clientX));
  image.addEventListener("touchend",()=>down=false);
}
$("#hero360Btn")?.addEventListener("click",open360);
$("#dimension360Btn")?.addEventListener("click",open360);

/* ============================================================
   STYLE FINDER
   ============================================================ */
const styleQuestions=[
  { q:"What is your fashion style?", a:["Minimal","Streetwear","Elegant","Casual"] },
  { q:"Choose your favorite color", a:["Black","White","Cream","Bold"] },
  { q:"What is your budget?", a:["₹2,000","₹5,000","₹8,000","₹10,000+"] }
];
let styleStep=0;
let styleAnswers=[];

function showStyle(){
  const box=$("#styleFinderContent");
  const q=styleQuestions[styleStep];
  box.innerHTML=`
    <span>STYLE FINDER · STEP ${styleStep+1} OF ${styleQuestions.length}</span>
    <h2>${q.q}</h2>
    <div class="style-options">
      ${q.a.map(a=>`<button data-answer="${a}">${a}</button>`).join("")}
    </div>`;
  $$(".style-options button").forEach(btn=>{
    btn.onclick=()=>{
      styleAnswers.push(btn.dataset.answer);
      styleStep++;
      if(styleStep<styleQuestions.length) showStyle();
      else finishStyle();
    };
  });
}
function finishStyle(){
  $("#styleFinderContent").innerHTML=`
    <span>STYLE FINDER · RESULT</span>
    <h2>Your WearWise Style Is Ready ✦</h2>
    <p>We selected fashion based on your answers.</p>
    <button class="primary-btn" id="styleResults">SHOW MY PRODUCTS</button>`;
  $("#styleResults").onclick=()=>{
    $("#styleModalOverlay").classList.remove("show");
    currentCategory="All";
    showWishlistOnly=false;
    visibleCount=12;
    if($("#shopHeading"))$("#shopHeading").textContent="New Arrivals";
    renderProducts();
    $("#new-arrivals").scrollIntoView({behavior:"smooth"});
  };
}
$("#styleFinderBtn")?.addEventListener("click",()=>{
  styleStep=0; styleAnswers=[];
  $("#styleModalOverlay")?.classList.add("show");
  showStyle();
});
$$("[data-close-style]").forEach(b=>{
  b.onclick=()=>$("#styleModalOverlay")?.classList.remove("show");
});

/* ============================================================
   COUPON
   ============================================================ */
$("#applyCoupon")?.addEventListener("click",()=>{
  const code=$("#couponInput").value.trim().toUpperCase();
  if(code==="WW10"){ discount=.10; toast("10% discount applied ✓"); }
  else if(code==="WW20"){ discount=.20; toast("20% discount applied ✓"); }
  else{ discount=0; toast("Invalid coupon"); }
  renderCart();
});

/* ============================================================
   CHECKOUT
   ============================================================ */
$("#checkoutBtn")?.addEventListener("click",()=>{
  if(!cart.length){ toast("Your cart is empty"); return; }
  closeCart();
  $("#checkoutModal")?.classList.add("show");
});
$$("[data-close-checkout]").forEach(b=>{
  b.onclick=()=>$("#checkoutModal")?.classList.remove("show");
});

function validateCheckout(form){
  const errors=[];
  const cardNumber=form.querySelector("#cardNumber").value.replace(/\s/g,"");
  const expiry=form.querySelector("#cardExpiry").value.trim();
  const cvv=form.querySelector("#cardCvv").value.trim();
  const pin=form.querySelector("#pinCode").value.trim();
  const email=form.querySelector("#checkoutEmail").value.trim();

  if(!/^\d{16}$/.test(cardNumber)) errors.push("Card number must be 16 digits.");
  if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) errors.push("Expiry must be in MM/YY format.");
  if(!/^\d{3,4}$/.test(cvv)) errors.push("CVV must be 3–4 digits.");
  if(!/^\d{6}$/.test(pin)) errors.push("PIN code must be 6 digits.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  return errors;
}

$("#checkoutForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.target;
  const errorBox=$("#checkoutErrors");
  const errors=validateCheckout(form);

  if(errors.length){
    if(errorBox){ errorBox.style.display="block"; errorBox.innerHTML=errors.map(err=>`<li>${err}</li>`).join(""); }
    return;
  }
  if(errorBox){ errorBox.style.display="none"; errorBox.innerHTML=""; }

  const order="WW-"+Math.floor(100000+Math.random()*900000);
  const paymentMethod = form.querySelector("input[name='paymentMethod']:checked")?.value || "card";
  const subtotal=cart.reduce((sum,item)=>{
    const p=getProduct(item.id);
    return p ? sum+p.price*item.qty : sum;
  },0);
  const total = Math.round(subtotal*(1-discount));

  const orderRecord={
    id: order, date: new Date().toISOString(), paymentMethod, total,
    items: cart.map(item=>{
      const p=getProduct(item.id);
      return { id:item.id, name:p?.name||item.id, qty:item.qty, size:item.size, color:item.color, price:p?.price||0 };
    })
  };
  const orders = JSON.parse(localStorage.getItem("wearwiseOrders") || "[]");
  orders.unshift(orderRecord);
  localStorage.setItem("wearwiseOrders", JSON.stringify(orders));

  cart=[]; discount=0;
  save(); renderCart(); form.reset();

  $("#checkoutModal")?.classList.remove("show");
  const orderEl = document.querySelector(".order-number");
  if(orderEl) orderEl.textContent=order;
  $("#successModal")?.classList.add("show");
  toast("Order placed successfully ✓");
});
$$("[data-close-success]").forEach(b=>{
  b.onclick=()=>$("#successModal")?.classList.remove("show");
});
$("#cardNumber")?.addEventListener("input",e=>{
  let v=e.target.value.replace(/\D/g,"").slice(0,16);
  e.target.value=v.replace(/(.{4})/g,"$1 ").trim();
});

/* ============================================================
   ACCOUNT
   ============================================================ */
$("#accountBtn")?.addEventListener("click",()=>{ $("#accountModal")?.classList.add("show"); });
$$("[data-close-account]").forEach(b=>{
  b.onclick=()=>$("#accountModal")?.classList.remove("show");
});
$("#loginForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  $("#accountModal")?.classList.remove("show");
  e.target.reset();
  toast("Welcome to WearWise ✓");
});

/* ============================================================
   NEWSLETTER
   ============================================================ */
$("#newsletterForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  e.target.reset();
  toast("Welcome to the WearWise world ✦");
});

/* ============================================================
   MOBILE MENU
   ============================================================ */
$("#menuBtn")?.addEventListener("click",()=>{ $("nav")?.classList.toggle("mobile-open"); });
$$("nav a").forEach(a=>{
  a.addEventListener("click",()=>{ $("nav")?.classList.remove("mobile-open"); });
});

/* ============================================================
   PARALLAX
   ============================================================ */
document.addEventListener("mousemove",e=>{
  const heroVisual=$(".hero-visual");
  if(!heroVisual || window.innerWidth<1000)return;
  const x=(e.clientX/window.innerWidth-.5)*20;
  const y=(e.clientY/window.innerHeight-.5)*20;
  heroVisual.style.transform=`translate(${x}px,${y}px)`;
});

/* ============================================================
   COUNTDOWN
   ============================================================ */
const end=Date.now()+2*24*60*60*1000;
function countdown(){
  let diff=Math.max(0,end-Date.now());
  const d=Math.floor(diff/86400000);
  const h=Math.floor(diff/3600000)%24;
  const m=Math.floor(diff/60000)%60;
  const s=Math.floor(diff/1000)%60;
  if($("#days"))$("#days").textContent=String(d).padStart(2,"0");
  if($("#hours"))$("#hours").textContent=String(h).padStart(2,"0");
  if($("#minutes"))$("#minutes").textContent=String(m).padStart(2,"0");
  if($("#seconds"))$("#seconds").textContent=String(s).padStart(2,"0");
}
setInterval(countdown,1000);
countdown();

/* ============================================================
   TOAST
   ============================================================ */
function toast(message){
  let t=document.createElement("div");
  t.className="ww-toast";
  t.textContent=message;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add("show"),10);
  setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>t.remove(),300); },2500);
}

/* ============================================================
   MODALS: backdrop click + ESC to close
   ============================================================ */
$$(".modal-overlay").forEach(modal=>{
  modal.addEventListener("click",e=>{ if(e.target===modal) modal.classList.remove("show"); });
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    $$(".modal-overlay.show").forEach(m=>m.classList.remove("show"));
    closeCart();
  }
});

/* ============================================================
   PRODUCT DETAIL VIEW
   ============================================================ */
function renderProductView(id){
  const p = id ? getProduct(id) : null;
  const detail = $("#productDetail");
  const reviewsSection = $("#reviews");
  const relatedSection = $("#relatedSection");
  const recentSection = $("#recentlyViewedSectionProduct");

  if(!p){
    detail.innerHTML = `
      <div class="not-found">
        <h2>We couldn't find that product</h2>
        <p>It may have sold out or the link may be broken.</p>
        <a class="primary-btn" href="#/">BACK TO SHOP</a>
      </div>`;
    $("#breadcrumb").style.display="none";
    if(reviewsSection) reviewsSection.style.display="none";
    if(relatedSection) relatedSection.style.display="none";
    if(recentSection) recentSection.style.display="none";
    return;
  }

  $("#breadcrumb").style.display="";
  if(reviewsSection) reviewsSection.style.display="";
  if(relatedSection) relatedSection.style.display="";

  $("#breadcrumb").innerHTML = `
    <a href="#/">Home</a> /
    <a href="#/" class="cat-link" data-category="${p.category}">${p.category}</a> /
    <span>${p.name}</span>`;
  $("#breadcrumb .cat-link").addEventListener("click", e=>{
    e.preventDefault();
    currentCategory=p.category;
    showWishlistOnly=false;
    visibleCount=12;
    if($("#shopHeading"))$("#shopHeading").textContent=p.category;
    navigate("#/");
    setTimeout(()=>{ renderProducts(); $("#new-arrivals")?.scrollIntoView({behavior:"smooth"}); },0);
  });

  trackRecentlyViewed(p.id);
  refreshHomeRecentlyViewed();

  const outOfStock = p.stock<=0;
  const off = Math.round((1-p.price/p.oldPrice)*100);
  const stockLine = outOfStock
    ? `<div class="stock-line out">Out of stock</div>`
    : p.stock<5
      ? `<div class="stock-line low">Only ${p.stock} left in stock — order soon</div>`
      : `<div class="stock-line ok">In stock, ready to ship</div>`;

  detail.innerHTML = `
    <div class="gallery">
      <div class="gallery-main">
        <img id="galleryMain" src="${p.gallery[0]}" alt="${p.name}"
         onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80'">
        <span class="discount">${off}% OFF</span>
      </div>
      <div class="gallery-thumbs" id="galleryThumbs">
        ${p.gallery.map((src,i)=>`<button class="thumb ${i===0?'active':''}" data-src="${src}"><img src="${src}"></button>`).join("")}
      </div>
    </div>

    <div class="product-panel">
      <small>${p.category}</small>
      <h1>${p.name}</h1>
      <a href="#reviews-anchor" class="rating-link" id="ratingLink">★ ${p.rating} <span class="review-count">(${p.reviews.length} reviews)</span></a>

      <div class="price-row">
        <strong>₹${p.price.toLocaleString()}</strong>
        <del>₹${p.oldPrice.toLocaleString()}</del>
      </div>

      ${stockLine}

      <label>Size <a href="#/policies" id="sizeGuideLink" class="text-link small">size guide</a></label>
      <select id="pdSize" ${outOfStock?"disabled":""}>
        ${p.sizes.map(s=>`<option>${s}</option>`).join("")}
      </select>

      <label>Color</label>
      <select id="pdColor" ${outOfStock?"disabled":""}>
        ${p.colors.map(c=>`<option>${c}</option>`).join("")}
      </select>

      <label>Quantity</label>
      <div class="qty pd-qty">
        <button id="pdQtyMinus" type="button" aria-label="Decrease quantity">−</button>
        <span id="pdQtyValue">1</span>
        <button id="pdQtyPlus" type="button" aria-label="Increase quantity">+</button>
      </div>

      <div class="pd-actions">
        <button class="primary-btn full" id="pdAdd" ${outOfStock?"disabled":""}>
          ${outOfStock ? "OUT OF STOCK" : "ADD TO CART"}
        </button>
        <button class="secondary-btn full" id="pdWish">
          ${wishlist.includes(p.id) ? "♥ IN WISHLIST" : "♡ ADD TO WISHLIST"}
        </button>
      </div>

      <p class="pd-description">Cut from considered fabric and finished by hand, this piece is built to hold its shape wash after wash. Part of the ${p.category} edit — pair it with the rest of the collection for a complete look.</p>

      <div class="trust-mini">
        <span>✓ Free shipping over ₹4,999</span>
        <span>✓ 14-day easy returns</span>
        <span>✓ Secure checkout</span>
      </div>
    </div>`;

  $("#ratingLink").addEventListener("click",e=>{
    e.preventDefault();
    $("#reviews")?.scrollIntoView({behavior:"smooth"});
  });
  $("#sizeGuideLink").addEventListener("click",()=>{ pendingAnchor="size-guide"; });

  $$(".thumb").forEach(btn=>{
    btn.addEventListener("click",()=>{
      $("#galleryMain").src = btn.dataset.src;
      $$(".thumb").forEach(t=>t.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  let qty = 1;
  $("#pdQtyMinus").addEventListener("click",()=>{ qty=Math.max(1,qty-1); $("#pdQtyValue").textContent=qty; });
  $("#pdQtyPlus").addEventListener("click",()=>{ qty=Math.min(p.stock||99,qty+1); $("#pdQtyValue").textContent=qty; });

  if(!outOfStock){
    $("#pdAdd").addEventListener("click",()=>{
      const size=$("#pdSize").value, color=$("#pdColor").value;
      const item=cart.find(x=>x.id===p.id);
      if(item){ item.qty+=qty; item.size=size; item.color=color; }
      else{ cart.push({id:p.id, qty, size, color}); }
      save(); renderCart();
      toast("Added to cart ✓");
    });
  }
  $("#pdWish").addEventListener("click",()=>{
    toggleWishlist(p.id);
    $("#pdWish").innerHTML = wishlist.includes(p.id) ? "♥ IN WISHLIST" : "♡ ADD TO WISHLIST";
  });

  /* reviews (seeded + locally submitted) */
  function loadLocalReviews(){ return JSON.parse(localStorage.getItem(`wearwiseReviews-${p.id}`) || "[]"); }
  function renderReviews(){
    const all = [...loadLocalReviews(), ...p.reviews];
    $("#reviewsList").innerHTML = all.map(r=>`
      <div class="review-card">
        <div class="review-head">
          <strong>${r.name}</strong>
          <span class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span>
        </div>
        <p>${r.text}</p>
      </div>`).join("");
  }
  renderReviews();

  const reviewForm = $("#reviewForm");
  reviewForm.onsubmit = e=>{
    e.preventDefault();
    const name = $("#reviewName").value.trim();
    const rating = Number($("#reviewRating").value);
    const text = $("#reviewText").value.trim();
    if(!name || !text) return;
    const local = loadLocalReviews();
    local.unshift({name, rating, text});
    localStorage.setItem(`wearwiseReviews-${p.id}`, JSON.stringify(local));
    renderReviews();
    e.target.reset();
    toast("Review posted ✓");
  };

  /* related products */
  const related = products.filter(x=>x.category===p.category && x.id!==p.id).slice(0,4);
  const relatedGrid = $("#relatedGrid");
  if(related.length){
    relatedGrid.innerHTML = related.map(r=>productCard(r.id)).join("");
    wireProductCardEvents(relatedGrid);
    relatedSection.style.display="";
  }else{
    relatedSection.style.display="none";
  }

  /* recently viewed (excluding this product) */
  renderRecentlyViewed(recentSection, $("#recentlyViewedGridProduct"), p.id);
}

/* ============================================================
   ORDER HISTORY VIEW
   ============================================================ */
function renderOrdersView(){
  const orders = JSON.parse(localStorage.getItem("wearwiseOrders") || "[]");
  const list = $("#ordersList");
  if(!list) return;

  if(!orders.length){
    list.innerHTML = `
      <div class="no-orders">
        <p>You haven't placed any orders yet.</p>
        <a class="primary-btn" href="#/" style="margin-top:1.2rem;display:inline-flex;">START SHOPPING</a>
      </div>`;
    return;
  }

  list.innerHTML = orders.map(o=>{
    const date = new Date(o.date).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
    const payLabel = {card:"Card",upi:"UPI",cod:"Cash on Delivery"}[o.paymentMethod] || o.paymentMethod;
    return `
    <div class="order-card">
      <div class="order-card-head">
        <strong>${o.id}</strong>
        <span>${date} · ${payLabel}</span>
      </div>
      ${o.items.map(item=>`
        <div class="order-line">
          <span>${item.name} (${item.size}, ${item.color}) × ${item.qty}</span>
          <span>₹${(item.price*item.qty).toLocaleString()}</span>
        </div>`).join("")}
      <div class="order-total"><span>Total</span><span>₹${o.total.toLocaleString()}</span></div>
    </div>`;
  }).join("");
}

/* ============================================================
   INIT
   ============================================================ */
if($("#wishlistCount")) $("#wishlistCount").textContent=wishlist.length;

renderProducts();
renderCart();
refreshHomeRecentlyViewed();
router();
