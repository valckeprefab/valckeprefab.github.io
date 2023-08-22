window.onload = async function () {
    setTextByLanguage();
}

function setTextByLanguage() {
    document.getElementById("test").textContent = Intl.NumberFormat().resolvedOptions().locale;
}