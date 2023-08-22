window.onload = async function () {
    setTextByLanguage();
}

function getUserLang() {
    var userLang = navigator.languages;//navigator.language || navigator.userLanguage;
    return userLang;
}

function setTextByLanguage() {
    document.getElementById("test1").textContent = navigator.languages;
    document.getElementById("test2").textContent = navigator.language;
    document.getElementById("test3").textContent = navigator.userLanguage;
}