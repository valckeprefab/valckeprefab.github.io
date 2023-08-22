window.onload = async function () {
    setTextByLanguage();
}

function getUserLang() {
    var userLang = navigator.languages;//navigator.language || navigator.userLanguage;
    return userLang;
}

function setTextByLanguage() {
    var userLang = getUserLang();
    const div = document.getElementById("test");
    //console.log(key);
    //console.log(textUi[key]);
    //console.log(textUi[key][userLang]);
    if (div != null && div != undefined) {
        div.textContent = userLang;
    }
}