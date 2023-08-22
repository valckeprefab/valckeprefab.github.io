window.onload = async function () {
    setTextByLanguage();
}

function setTextByLanguage() {
    document.getElementById("test").textContent = navigator.language;
}