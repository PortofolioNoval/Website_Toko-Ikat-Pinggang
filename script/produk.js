// produk.js (REPLACE existing file with this)
(function(){
    // --- State ---
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- Elements ---
    const cartCountEl = document.getElementById('cart-count');
    const miniCart = document.getElementById('miniCart');
    const cartItemsEl = document.getElementById('cartItems');
    const totalPriceEl = document.getElementById('totalPrice');
    const cartIcon = document.getElementById('cart');
    const overlay = document.getElementById('overlay');
    const checkoutSummary = document.getElementById('checkoutSummary');
    const btnCheckout = document.getElementById('btnCheckout');
    const btnConfirm = document.getElementById('confirmPay');
    const btnCancelCheckout = document.getElementById('cancelCheckout');

    // --- Helpers ---
    function parsePrice(text){
        return parseInt((text+"").replace(/[^0-9]/g,'') ) || 0;
    }
    function formatRupiah(num){
        return new Intl.NumberFormat('id-ID').format(num);
    }
    function saveCart(){ localStorage.setItem('cart', JSON.stringify(cart)); }
    function getTotalQty(){ return cart.reduce((s,i)=>s+i.qty,0); }
    function getTotalPrice(){ return cart.reduce((s,i)=>s + (i.price * i.qty),0); }

    // --- UI updates ---
    function updateCartUI(){
        cartCountEl.textContent = getTotalQty();
        saveCart();
        renderMiniCart();
        // small pop animation (non-blocking)
        try{
            cartCountEl.animate(
                [{ transform: 'scale(1)'},{ transform: 'scale(1.18)'},{ transform: 'scale(1)'}],
                { duration:220 }
            );
        }catch(e){}
    }

    function renderMiniCart(){
        cartItemsEl.innerHTML = '';
        if(cart.length === 0){
            cartItemsEl.innerHTML = '<p class="muted" style="text-align:center;margin:12px 0">Keranjang kosong</p>';
            totalPriceEl.textContent = '0';
            return;
        }

        cart.forEach((item, idx)=>{
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="left">
                    <div style="width:44px;height:44px;border-radius:8px;background:#fff;display:grid;place-items:center;font-weight:700;color:#222">
                        ${(item.name && item.name.charAt(0)) || '?'}
                    </div>
                    <div>
                        <div style="font-weight:600">${item.name}</div>
                        <div class="muted">Rp ${formatRupiah(item.price)}</div>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                    <div class="qty-control">
                        <button data-action="dec" data-idx="${idx}">-</button>
                        <div style="min-width:28px;text-align:center">${item.qty}</div>
                        <button data-action="inc" data-idx="${idx}">+</button>
                    </div>
                    <button class="remove-btn" data-idx="${idx}">Hapus</button>
                </div>
            `;
            cartItemsEl.appendChild(div);
        });

        totalPriceEl.textContent = formatRupiah(getTotalPrice());
    }

    // --- BUY NOW (tidak menyentuh cart) ---
    // tempOrder digunakan hanya untuk mode Buy Now (saat checkout langsung dari produk)
    window.tempOrder = null;
    window.buyNow = function(btn){
        const card = btn.closest('.card') || btn.closest('.flash-card');
        if(!card) return;
        const name = (card.querySelector('h3') || card.querySelector('h4')).textContent.trim();
        const price = parsePrice((card.querySelector('p') || {}).textContent || '');
        // set tempOrder object
        window.tempOrder = { name, price, qty: 1 };
        // render checkout summary for tempOrder
        checkoutSummary.innerHTML = `<ul><li>${name} x1 — Rp ${formatRupiah(price)}</li></ul>
                                     <p class="muted">Total: Rp ${formatRupiah(price)}</p>`;
        overlay.style.display = 'flex';
    };

    // --- Add to cart (ke cart, tidak membuka modal) ---
    window.addToCart = function(btn){
        const card = btn.closest('.card') || btn.closest('.flash-card');
        if(!card) return;
        const nameEl = card.querySelector('h3') || card.querySelector('h4');
        const name = nameEl ? nameEl.textContent.trim() : 'Produk';
        const priceText = (card.querySelector('p') || {}).textContent || '';
        const price = parsePrice(priceText);

        const found = cart.find(i=>i.name === name && i.price === price);
        if(found){ found.qty += 1; } else { cart.push({ name, price, qty: 1 }); }

        updateCartUI();

        // small feedback on button (keep animation)
        const original = btn.textContent;
        btn.textContent = 'Ditambahkan ✓';
        btn.style.background = '#28a745';
        setTimeout(()=>{
            btn.textContent = original;
            btn.style.background='';
        }, 700);
    };

    // --- Mini cart interactions (delegation) ---
    cartItemsEl.addEventListener('click', (e)=>{
        const btn = e.target;
        const idx = btn.getAttribute && btn.getAttribute('data-idx');
        if(idx === null || idx === undefined) return;
        const i = parseInt(idx);
        if(btn.getAttribute('data-action') === 'inc'){
            cart[i].qty += 1; updateCartUI();
        } else if(btn.getAttribute('data-action') === 'dec'){
            if(cart[i].qty > 1){ cart[i].qty -= 1; } else { cart.splice(i,1); }
            updateCartUI();
        } else if(btn.classList.contains('remove-btn')){
            cart.splice(i,1); updateCartUI();
        }
    });

    // toggle mini cart
    cartIcon.addEventListener('click', (e)=>{ e.stopPropagation(); miniCart.style.display = miniCart.style.display === 'block' ? 'none' : 'block'; });
    document.addEventListener('click', (e)=>{ if(!miniCart.contains(e.target) && !cartIcon.contains(e.target)){ miniCart.style.display = 'none'; } });

    // Checkout flow (open modal with cart items)
    btnCheckout.addEventListener('click', ()=>{
        if(cart.length === 0){ alert('Keranjang kosong'); return; }
        let html = '<ul>' + cart.map(i=>`<li>${i.name} x${i.qty} — Rp ${formatRupiah(i.price*i.qty)}</li>`).join('') + '</ul>';
        html += `<p class="muted">Total: Rp ${formatRupiah(getTotalPrice())}</p>`;
        checkoutSummary.innerHTML = html;
        // ensure tempOrder cleared (we are checking out from cart)
        window.tempOrder = null;
        overlay.style.display = 'flex';
    });

    // Confirm payment -> build WA message (handles both modes: tempOrder / cart)
    btnConfirm.addEventListener('click', ()=>{
        const fullName = document.getElementById('name').value.trim();
        const address = document.getElementById('address').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const note = document.getElementById('note').value.trim();
        const paymentMethod = document.getElementById('paymentMethod').value;

        if(!fullName || !address || !phone){ alert('Isi semua data pengiriman (nama, alamat, nomor HP)'); return; }

        // build message header
        let msg = `Halo, saya ingin melakukan pemesanan:%0A`;
        msg += `Nama: ${fullName}%0AAlamat: ${address}%0ANo HP: ${phone}%0AMetode Pembayaran: ${paymentMethod}%0ACatatan: ${note ? note : '-'}%0A%0A`;

        if(window.tempOrder){
            // Buy Now mode (do NOT modify cart)
            msg += `Pesanan (Buy Now):%0A`;
            msg += `- ${window.tempOrder.name} x${window.tempOrder.qty} — Rp ${formatRupiah(window.tempOrder.price * window.tempOrder.qty)}%0A`;
            msg += `%0ATotal: Rp ${formatRupiah(window.tempOrder.price * window.tempOrder.qty)}`;
            // clear tempOrder after use
            window.tempOrder = null;
        } else {
            // From cart mode
            msg += `Pesanan:%0A`;
            cart.forEach(it => { msg += `- ${it.name} x${it.qty} — Rp ${formatRupiah(it.price*it.qty)}%0A`; });
            msg += `%0ATotal: Rp ${formatRupiah(getTotalPrice())}`;
            // After sending order from cart we clear cart
            cart = [];
            updateCartUI();
        }

        const adminNumber = '6281382268081';
        const waUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');

        // close modal & reset form
        overlay.style.display = 'none';
        miniCart.style.display = 'none';
        const form = document.getElementById('checkoutForm');
        if(form) form.reset();
    });

    btnCancelCheckout.addEventListener('click', ()=>{ overlay.style.display = 'none'; });

    // -------------------------
    // Promo slider logic (unchanged)
    const slides = document.querySelectorAll('.slide');
    const dotsContainer = document.querySelector('.dots');
    let currentSlide = 0;
    if(slides.length && dotsContainer){
        slides.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        });
    }
    const dots = dotsContainer ? dotsContainer.querySelectorAll('span') : [];
    function updateSlider() {
        const slidesWrap = document.querySelector('.slides');
        if(!slidesWrap) return;
        slidesWrap.style.transform = `translateX(-${currentSlide * 100}%)`;
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active-dot'));
        if(slides[currentSlide]) slides[currentSlide].classList.add('active');
        if(dots[currentSlide]) dots[currentSlide].classList.add('active-dot');
    }
    function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; updateSlider(); }
    function prevSlide() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; updateSlider(); }
    function goToSlide(index) { currentSlide = index; updateSlider(); }
    const nextBtn = document.querySelector('.next');
    const prevBtn = document.querySelector('.prev');
    if(nextBtn) nextBtn.addEventListener('click', nextSlide);
    if(prevBtn) prevBtn.addEventListener('click', prevSlide);
    updateSlider();
    setInterval(()=>{ if(slides.length) nextSlide(); }, 3500);

    // -------------------------
    // SEARCH FEATURE
    const searchInput = document.querySelector('.top-bar input[placeholder*="Cari"], .top-bar input[aria-label*="Search"]');
    function ensureDataNames(){
        // Ensure every card has a data-name attribute for reliable searching
        document.querySelectorAll('.card, .flash-card').forEach(el=>{
            if(!el.getAttribute('data-name')){
                const n = (el.querySelector('h3') || el.querySelector('h4'));
                if(n) el.setAttribute('data-name', n.textContent.trim().toLowerCase());
            }
        });
    }
    ensureDataNames();
    if(searchInput){
        searchInput.addEventListener('input', (e)=>{
            const q = e.target.value.trim().toLowerCase();
            ensureDataNames();
            document.querySelectorAll('.card').forEach(card=>{
                const name = (card.getAttribute('data-name') || '').toLowerCase();
                card.style.display = name.includes(q) ? '' : 'none';
            });
        });
    }

    // -------------------------
    // FLASH SALE: ensure flash carousel references are safe (if you have flash slider logic elsewhere)
    // (No override here — keep existing flash JS; this file focuses on cart/search/checkout fixes)

function handleSearch(){
    const keyword = document.querySelector(".top-bar input").value.trim();
    if(keyword.length > 0){
        localStorage.setItem("lastSearch", keyword);
        window.location.href = `hasil-pencarian.html?q=${keyword}`;
    }
}


    // init UI
    updateCartUI();
})();
