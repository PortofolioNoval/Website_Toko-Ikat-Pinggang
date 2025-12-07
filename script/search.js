// search.js
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector(".top-bar input");

    if (!searchInput) return;

    searchInput.addEventListener("keypress", function(e){
        if(e.key === "Enter"){
            const keyword = this.value.trim();

            if(keyword.length > 0){
                localStorage.setItem("searchKeyword", keyword);
                window.location.href = "../src/hasil-pencarian.html";
            }
        }
    });
});

const urlParams = new URLSearchParams(window.location.search);
let searchQuery = urlParams.get("q");

// Jika user buka file langsung tanpa query → ambil dari localStorage
if(!searchQuery){
    searchQuery = localStorage.getItem("lastSearch") || "";
}

// Simpan lagi query agar konsisten
localStorage.setItem("lastSearch", searchQuery);

// Isi judul halaman
document.getElementById("searchQuery").textContent = searchQuery;

// lalu lanjutkan proses filter produk...
function handleSearch() {
    const keyword = document.getElementById("searchInput").value.trim();
    if (keyword.length > 0) {
        localStorage.setItem("lastSearch", keyword);
        window.location.href = `hasil-pencarian.html?q=${encodeURIComponent(keyword)}`;
    }
}

// Aktifkan juga saat menekan tombol Enter
document.addEventListener("keydown", function(e){
    if(e.key === "Enter"){
        handleSearch();
    }
});
