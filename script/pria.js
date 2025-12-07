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

    // helpers
    function parsePrice(text){
        return parseInt((text+"").replace(/[^0-9]/g,'') ) || 0;
    }
    function formatRupiah(num){
        return new Intl.NumberFormat('id-ID').format(num);
    }

    // --- Cart operations ---
    function saveCart(){ localStorage.setItem('cart', JSON.stringify(cart)); }
    function getTotalQty(){ return cart.reduce((s,i)=>s+i.qty,0); }
    function getTotalPrice(){ return cart.reduce((s,i)=>s + (i.price * i.qty),0); }

    function updateCartUI(){
        cartCountEl.textContent = getTotalQty();
        saveCart();
        renderMiniCart();
        // little pop animation
        try{
            cartCountEl.animate([{ transform: 'scale(1)'},{ transform: 'scale(1.2)'},{ transform: 'scale(1)'}], { duration:220 });
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
                    <div style="width:44px;height:44px;border-radius:8px;background:#fff;display:grid;place-items:center;font-weight:700;color:#222">${item.name.charAt(0)}</div>
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

// === BUY NOW FUNCTION (langsung checkout) ===
window.buyNow = function(btn){
    const card = btn.closest('.card');
    const name = card.querySelector('h3').textContent.trim();
    const price = parsePrice(card.querySelector('p').textContent.trim());

    // HANYA untuk checkout display — tidak menyentuh keranjang
    let html = `
        <ul><li>${name} x1 — Rp ${formatRupiah(price)}</li></ul>
        <p class="muted">Total: Rp ${formatRupiah(price)}</p>
    `;
    checkoutSummary.innerHTML = html;

    // Simpan order sementara untuk konfirmasi pembayaran
    window.tempOrder = { name, price, qty: 1 };

    overlay.style.display = 'flex';
};



// --- Add to cart (global so inline onclick works) ---
window.addToCart = function(btn){
    const card = btn.closest('.card');
    const name = card.querySelector('h3').textContent.trim();
    const priceText = card.querySelector('p').textContent.trim();
    const price = parsePrice(priceText);

    const found = cart.find(i=>i.name === name && i.price === price);
    if(found){ found.qty += 1; } 
    else { cart.push({ name, price, qty: 1 }); }

    updateCartUI();

    // small feedback on button (jangan hilangkan animasi)
    const original = btn.textContent;
    btn.textContent = 'Ditambahkan ✓';
    btn.style.background = '#28a745';
    setTimeout(()=>{
        btn.textContent = original;
        btn.style.background='';
    }, 700);
}


    // --- Mini cart interactions (delegation) ---
    cartItemsEl.addEventListener('click', (e)=>{
        const btn = e.target;
        const idx = btn.getAttribute && btn.getAttribute('data-idx');
        if(!idx) return;
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

    // close mini cart when click outside
    document.addEventListener('click', (e)=>{ if(!miniCart.contains(e.target) && !cartIcon.contains(e.target)){ miniCart.style.display = 'none'; } });

    // Checkout flow
    btnCheckout.addEventListener('click', ()=>{
        if(cart.length === 0){ alert('Keranjang kosong'); return; }
        let html = '<ul>' + cart.map(i=>`<li>${i.name} x${i.qty} — Rp ${formatRupiah(i.price*i.qty)}</li>`).join('') + '</ul>';
        html += `<p class="muted">Total: Rp ${formatRupiah(getTotalPrice())}</p>`;
        checkoutSummary.innerHTML = html;
        overlay.style.display = 'flex';
    });

    // confirm payment → open WhatsApp with order details
btnConfirm.addEventListener('click', ()=>{

    const fullName = document.getElementById('name').value.trim();
    const address = document.getElementById('address').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const note = document.getElementById('note').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if(!fullName || !address || !phone){
        alert('Isi semua data pengiriman (nama, alamat, nomor HP)');
        return;
    }

    let msg = `Halo, saya ingin melakukan pemesanan:%0A`;
    msg += `Nama: ${fullName}%0AAlamat: ${address}%0ANo HP: ${phone}%0AMetode Pembayaran: ${paymentMethod}%0ACatatan: ${note ? note : '-'}%0A%0A`;

    if(window.tempOrder){
        // BUY NOW MODE
        msg += `Pesanan (Buy Now):%0A`;
        msg += `- ${tempOrder.name} x1 — Rp ${formatRupiah(tempOrder.price)}%0A`;
        msg += `%0ATotal: Rp ${formatRupiah(tempOrder.price)}`;

        window.tempOrder = null; // hapus temporary order
    } else {
        // CART MODE
        msg += `Pesanan:%0A`;
        cart.forEach(it => {
            msg += `- ${it.name} x${it.qty} — Rp ${formatRupiah(it.price * it.qty)}%0A`;
        });
        msg += `%0ATotal: Rp ${formatRupiah(getTotalPrice())}`;

        cart = []; // hapus keranjang HANYA setelah cart checkout
        updateCartUI();
    }

    const adminNumber = '6281382268081';
    const waUrl = `https://wa.me/${adminNumber}?text=${msg}`;

    window.open(waUrl, '_blank');

    overlay.style.display = 'none';
    miniCart.style.display = 'none';
    document.getElementById('checkoutForm').reset();
});


    btnCancelCheckout.addEventListener('click', ()=>{ overlay.style.display = 'none'; });

// Promo Slider Logic
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.querySelector('.dots');
let currentSlide = 0;

// Create dots
slides.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
});
const dots = dotsContainer.querySelectorAll('span');

function updateSlider() {
    // Gerakkan slides ke kiri
    document.querySelector('.slides').style.transform =
        `translateX(-${currentSlide * 100}%)`;

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active-dot'));

    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active-dot');
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateSlider();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateSlider();
}

function goToSlide(index) {
    currentSlide = index;
    updateSlider();
}

document.querySelector('.next').addEventListener('click', nextSlide);
document.querySelector('.prev').addEventListener('click', prevSlide);

updateSlider();
setInterval(nextSlide, 3500);



// init UI
updateCartUI();
})();