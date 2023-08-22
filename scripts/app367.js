window.onload = async function () {
    setTextByLanguage();
}

function setTextByLanguage() {
    document.getElementById("test1").textContent = navigator.languages;
    document.getElementById("test2").textContent = navigator.language;
    document.getElementById("test3").textContent = navigator.userLanguage;
}