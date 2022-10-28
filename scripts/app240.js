var API = null;
var odooURL = "https://odoo.valcke-prefab.be"; //no slash at the end
var odooDatabase = "erp_prd"
var fetchLimit = 80;

window.onload = async function () {
    API = await Workspace.connect(window.parent, async (event, data) => {
        //console.log("Event: ", event, data);

        var eventName = event.split(".").pop();

        if (eventName === "onSelectionChanged") {
            await selectionChanged(data.data);
        }
    });

    fillObjectStatuses();
    setInterval(getRecentOdooData, 5000);
    setTextByLanguage();
}

//$("#testbtn").dxButton({
//    stylingMode: "outlined",
//    text: "test",
//    type: "success",
//    onClick: async function (data) {
//        try {
//            var token = await getToken();
//            var domain = '[["project_id.id", "=", "2238"],"|", ["name", "ilike", "dc46b795-7099-4f43-b1ff-75e4bf308bcb"],"|", ["name", "ilike", "d6419331-c75f-4a82-b8d9-77810938a7f1"],"|", ["name", "ilike", "6780d3e4-69b0-4635-8f4d-f780ac04cc20"],["name", "ilike", "610e1f82-7ba5-407c-b2d7-82549751e617"]]';
//            await $.ajax({
//                type: "GET",
//                url: odooURL + "/api/v1/search_read",
//                headers: { "Authorization": "Bearer " + token },
//                data: {
//                    model: "trimble.connect.main",
//                    domain: domain,
//                    fields: '["id"]',
//                },
//                success: function (odooData) {
//                    console.log(odooData);
//                }
//            });
//        }
//        catch (e) {
//            console.log(e);
//        }
//    },
//});

//#region global variables

var hasAccesToTransport = false;
var hasAccesToProduction = false;
var hasAccesToFreights = false;

var lastSelectionId = -1;

var maxRank = 99999;

let odooAssemblyData = null;

//variable to prevent selection changed event from doing its queries again after selection erection arrows
var performSelectionChanged = true;

var regexDate = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
var regexDateAndTime = /[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/;

var resetSlipDropdown = true;

const StatusModelled = "Modelled";
const StatusExisting = "Existing";
const StatusDrawn = "Drawn";
const StatusOnHold = "OnHold";
const StatusPlanned = "Planned";
const StatusDemoulded = "Demoulded";
const StatusProductionEnded = "ProductionEnded";
const StatusAvailableForTransport = "AvailableForTransport";
const StatusPlannedForTransport = "PlannedForTransport";
const StatusTransported = "Transported";

var titlesShown = true;

//#endregion

//#region collections

var existingSlips = [
    //{
    //    OdooId: 10,
    //    State: 'Draft',
    //    Name: 'TB003322',
    //    Elements: [],
    //    Guids: [],
    //    Date: GetDateFromString("2022-02-15"),
    //},
    //{
    //    OdooId: 21,
    //    State: 'Confirmed',
    //    Name: 'TB003323',
    //    Elements: [],
    //    Guids: [],
    //    Date: GetDateFromString("2022-02-16"),
    //}
];

const filterTypes = {
    nl: ["Prefix", "Merk", "Manueel gebruikersattribuut"],
    fr: ["Prefix", "Nom d'assemblage", "Propriété"],
    en: ["Prefix", "Assembly", "Attribute"]
};

const labelContentTypes = {
    nl: ["Merk", "BS_LengteKabel", "BS_LR"],
    fr: ["Assemblage", "BS_LongueurCable", "BS_GD"],
    en: ["Assembly", "BS_CableLength", "BS_LR"]
};

const labelContentTypesOdoo = {
    nl: ["Merk.Serienummer"],
    fr: ["Assemblage.NuméroDeSérie"],
    en: ["Assembly.Serialnumber"]
};

var freightColors = [
    { r: 230, g: 25, b: 75, a:255},
    { r: 60, g: 180, b: 75, a: 255 },
    { r: 255, g: 225, b: 25, a: 255 },
    { r: 0, g: 130, b: 200, a: 255 },
    { r: 245, g: 130, b: 48, a: 255 },
    { r: 145, g: 30, b: 180, a: 255 },
    { r: 70, g: 240, b: 240, a: 255 },
    { r: 240, g: 50, b: 230, a: 255 },
    { r: 210, g: 245, b: 60, a: 255 },
    { r: 250, g: 190, b: 212, a: 255 },
    { r: 0, g: 128, b: 128, a: 255 },
    { r: 220, g: 190, b: 255, a: 255 },
    { r: 170, g: 110, b: 40, a: 255 },
    { r: 255, g: 250, b: 200, a: 255 },
    { r: 128, g: 0, b: 0, a: 255 },
    { r: 170, g: 255, b: 195, a: 255 },
    { r: 128, g: 128, b: 0, a: 255 },
    { r: 255, g: 215, b: 180, a: 255 },
    { r: 0, g: 0, b: 128, a: 255 },
    { r: 128, g: 128, b: 128, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
    { r: 0, g: 0, b: 0, a: 255 },
];

var idsPerPrefixPerModelId = [];

var objectStatuses = [];

var selectionChangedIds = [];

var selectedObjects = [
    //{
    //    ModelId: "0",
    //    ObjectRuntimeId: 0,
    //    ObjectId: "0",
    //    Guid: "8d14bb4d-9b0e-4cf9-b7d7-a3740b154195",
    //    OdooTcmId: 68560,
    //    OdooPmmId: 150228,
    //    Weight: 8389,
    //    Prefix: "FM",//voor sorteren
    //    PosNmbr: 23,
    //    Rank: 1,
    //    AssemblyName: "FM23",
    //    OdooCode: "V8622.0000FM.0023"
    //},
];

const textUi = {
    titleVisibility: {
        nl: "Zichtbaarheid merken",
        fr: "Visibilité assemblages",
        en: "Visibility assemblies"
    },
    btnShowKnownPrefixes: {
        nl: "Toon enkel gekende prefixen",
        fr: "Afficher uniquement les préfixes connus",
        en: "Show only known prefixes"
    },
    btnShowKnownPrefixesFiltering: {
        nl: "Bezig met merken te filteren",
        fr: "En cours de filtrer les assemblages",
        en: "Filtering assemblies"
    },
    titleFilters: {
        nl: "Selecteren met filters",
        fr: "Sélection avec des filtres",
        en: "Select with filters"
    },
    titleFilterType: {
        nl: "Type filter:",
        fr: "Type filtre:",
        en: "Filter type: "
    },
    phOdooUsername: {
        nl: "Vul Odoo gebruikersnaam in, bvb Mattias Hemeryck wordt mhemeryck",
        fr: "Entrez nom d'utilisateur Odoo, p ex Mattias Hemeryck devient mhemeryck.",
        en: "Enter Odoo username, eg Mattias Hemeryck will be mhemeryck"
    },
    phOdooPassword: {
        nl: "Vul Odoo paswoord in",
        fr: "Entrez mot de passe Odoo",
        en: "Enter Odoo password"
    },
    titleSelectPrefixes: {
        nl: "Selecteer prefixen:",
        fr: "Sélectionner les préfixes:",
        en: "Select prefixes:"
    },
    titleAssemblyname: {
        nl: "Geef een merk op:",
        fr: "Entrez nom d'assemblage",
        en: "Enter assemblyname"
    },
    titlePropertyname: {
        nl: "Geef een property name op:",
        fr: "Entrez nom du propriété",
        en: "Enter property name"
    },
    titlePropertyvalue: {
        nl: "Geef een property value op:",
        fr: "Entrez valeur du propriété",
        en: "Enter property value"
    },
    phAssemblyname: {
        nl: "Geef een merk op, bvb K10 ...",
        fr: "Entrez nom d'assemblage, p ex K10 ...",
        en: "Enter assemblyname, eg K10 ..."
    },
    phPropertyname: {
        nl: "Geef een property name op, bvb. Default.MERKENPREFIX ...",
        fr: "Entrez nom du propriété, p ex Default.MERKENPREFIX ...",
        en: "Enter property name, eg Default.MERKENPREFIX ..."
    },
    phPropertyvalue: {
        nl: "Geef een property value op, bvb PS",
        fr: "Entrez valeur du propriété, p ex PS",
        en: "Enter property value, eg PS"
    },
    btnSelectByFilter: {
        nl: "Selecteer merken o.b.v. gekozen filter",
        fr: "Sélectionnez assemblages en fonction de filtre sélectionné",
        en: "Select assemblies by selected filter"
    },
    btnSelectByFilterSelecting: {
        nl: "Bezig met merken te selecteren",
        fr: "En cours de sélectionner les assemblages",
        en: "Selecting assemblies"
    },
    titlePropertylabels: {
        nl: "Labels plaatsen op basis van gegevens 3D model",
        fr: "Placer des étiquettes en fonction des données du modèle 3D",
        en: "Show labels based on 3D model properties"
    },
    btnShowLabels: {
        nl: "Plaats labels van geselecteerde",
        fr: "Placez les étiquettes de la sélection",
        en: "Show labels of selection"
    },
    btnShowLabelsShowing: {
        nl: "Bezig met labels plaatsen",
        fr: "En cours de places les étiquettes",
        en: "Showing labels"
    },
    titleVisualizeOdooData:
    {
        nl: "Odoo gegevens visualiseren",
        fr: "Visualisation de données Odoo",
        en: "Visualize Odoo data"
    },
    textEnterOdooData:
    {
        nl: "Vul gebruikersnaam en paswoord in en kies een actie",
        fr: "Entrez le nom d'utilisateur et le mot de passe et choisissez une action",
        en: "Enter Odoo username and password and choose an action"
    },
    titleAction1:
    {
        nl: "Actie 1: Model inkleuren volgens planningsstatus",
        fr: "Action 1 : Modéliser en couleurs selon l'état d'avancement du planning",
        en: "Action 1: Color model by planning status "
    },
    textRefdateToday:
    {
        nl: "Referentiedatum = vandaag?",
        fr: "Date de référence = aujourd'hui?",
        en: "Referencedate = today?"
    },
    textRefdate:
    {
        nl: "Referentiedatum: ",
        fr: "Date de référence: ",
        en: "Referencedate: "
    },
    btnSetColorFromStatus:
    {
        nl: "Kleur merken volgens planningsstatus",
        fr: "Colorer les assemblages en fonction du statut de planification",
        en: "Color assemblies by planningstatus"
    },
    btnSetColorFromStatusSetting:
    {
        nl: "Bezig met inkleuren volgens status",
        fr: "En cours de colorer les assemblages en fonction du statut de planification",
        en: "Coloring assemblies by planningstatus"
    },
    titleAction2:
    {
        nl: "Actie 2: Labels plaatsen bij gekende odoo merken",
        fr: "Action 2 : Ajouter des étiquettes aux assemblages connus d'Odoo",
        en: "Action 2: Add labels to assemblies known by Odoo"
    },
    btnSetOdooLabels:
    {
        nl: "Plaats labels van geselecteerde",
        fr: "Placez les étiquettes de la sélection",
        en: "Show labels of selection"
    },
    btnSetOdooLabelsSetting:
    {
        nl: "Bezig met labels plaatsen",
        fr: "En cours de places les étiquettes",
        en: "Showing labels"
    },
    titleAction3:
    {
        nl: "Actie 3: Selecteren van gekende odoo merken",
        fr: "Action 3 : Sélectionner les assemblages connus d'Odoo",
        en: "Action 3: Select assemblies known by Odoo"
    },
    errorMsgUsernamePassword:
    {
        nl: "Gelieve gebruikersnaam en/of paswoord in te vullen.",
        fr: "Entrer nom d'utilisateur et/ou mot de passe s.v.p.",
        en: "Please enter username and/or password."
    },
    legendExistingTitle:
    {
        nl: "Bestaand:",
        fr: "Existant:",
        en: "Already built:"
    },
    legendExistingDescr:
    {
        nl: "merk was reeds aanwezig voor de aanvang van het project.",
        fr: "l'assemblage était déjà présent avant le début du projet.",
        en: "the assembly was already present at the site before the project began."
    },
    legendModelledTitle:
    {
        nl: "Gemodelleerd:",
        fr: "Modelé:",
        en: "Modeled:"
    },
    legendModelledDescr:
    {
        nl: "merk is nog niet doorgegeven aan productie.",
        fr: "l'assemblage n'est pas encore passé en production.",
        en: "the assembly hasn't been passed on to production yet."
    },
    legendOnHoldTitle:
    {
        nl: "On hold:",
        fr: "En attente:",
        en: "On hold:"
    },
    legendOnHoldDescr:
    {
        nl: "merk staat tijdelijk 'on hold'.",
        fr: "l'assemblage est temporairement 'en attente'.",
        en: "the assembly has been temporarily put 'on hold'."
    },
    legendDrawnTitle:
    {
        nl: "Getekend:",
        fr: "Dessiné:",
        en: "Drawn:"
    },
    legendDrawnDescr:
    {
        nl: "merk werd doorgegeven aan productie.",
        fr: "l'assemblage est passée à la production.",
        en: "assembly has been passed on to production."
    },
    legendPlannedTitle:
    {
        nl: "Gepland:",
        fr: "Planifié:",
        en: "Planned:"
    },
    legendPlannedDescr:
    {
        nl: "merk is gepland om te produceren.",
        fr: "le début de la production d'assemblage est prévu.",
        en: "assembly is planned to be produced."
    },
    legendDemouldedTitle:
    {
        nl: "Ontkist:",
        fr: "Décoffrage:",
        en: "Demoulded:"
    },
    legendDemouldedDescr:
    {
        nl: "merk is ontkist maar moet nog extra bewerkingen ondergaan.",
        fr: "l'assemblage est décintriné mais ils restent encore quelques manipulations.",
        en: "assembly has been demoulded but still needs some work."
    },
    legendProductionEndedTitle:
    {
        nl: "Einde productie:",
        fr: "Production terminée:",
        en: "Production ended:"
    },
    legendProductionEndedDescr:
    {
        nl: "productie van het merk is voltooid voor/op de referentiedatum.",
        fr: "la production de l'assemblage est terminée avant/à la date de référence.",
        en: "production of the assembly has ended before/on the reference date."
    },
    legendAvailableForTransportTitle:
    {
        nl: "Beschikbaar voor transport:",
        fr: "Disponible pour le transport:",
        en: "Available for transport:"
    },
    legendAvailableForTransportDescr:
    {
        nl: "merk ligt klaar in de montagezone van de fabriek.",
        fr: "l'assemblage est prête à être transportée.",
        en: "assembly has been stocked and is ready for transport."
    },
    legendPlannedForTransportTitle:
    {
        nl: "Gepland voor transport:",
        fr: "Planifié pour le transport:",
        en: "Planned for transport:"
    },
    legendPlannedForTransportDescr:
    {
        nl: "merk is ingepland voor transport.",
        fr: "l'assemblage est planifié pour le transport.",
        en: "assembly has been planned for transport."
    },
    legendTransportedTitle:
    {
        nl: "Getransporteerd:",
        fr: "Transporté:",
        en: "Transported:"
    },
    legendTransportedDescr:
    {
        nl: "merk is getransporteerd naar de werf.",
        fr: "l'assemblage a été transporté au chantier.",
        en: "assembly has been transported to the site."
    },
    errorMsgNoOdooAssembliesFound:
    {
        nl: "Geen van de geselecteerde merken werd herkend door Odoo.",
        fr: "Aucune des assemblages sélectionnées n'a été reconnue par Odoo.",
        en: "None of the selected assemblies are recognized by Odoo."
    },
    btnShowAllColored:
    {
        nl: "Toon alle merken met kleur",
        fr: "Afficher toutes les assemblages avec la couleur",
        en: "Show alle assemblies as colored"
    },
    btnCreateSlip:
    {
        nl: "Maak nieuwe transportbon van huidige selectie",
        fr: "Créer un nouveau bon de livraison à partir de la sélection actuelle",
        en: "Create new delivery slip from current selection",
    },
    btnCreatingSlip:
    {
        nl: "Bezig met nieuwe transportbon aan te maken",
        fr: "En cours de créer un nouveau bon de livraison",
        en: "Creating new delivery slip",
    },
    errorMsgNoAssemblySelection:
    {
        nl: "Labels kunnen enkel geplaatst worden van objecten die geselecteerd werden met \"Assembly selection\".",
        fr: "Les étiquettes ne peuvent être placées qu'à partir d'objets sélectionnés avec \"Sélection d'assemblage\".",
        en: "Can only show labels of objects that were selected with \"Assembly selection\" on."
    },
    btnShowTitles:
    {
        nl: "Toon titels",
        fr: "Afficher titres",
        en: "Show titles"
    },
    btnHideTitles:
    {
        nl: "Verberg titels",
        fr: "Cacher titres",
        en: "Hide titles"
    },
    btnOdooSearch:
    {
        nl: "Selecteren",
        fr: "Sélectionner",
        en: "Select"
    },
    titleExistingSlips:
    {
        nl: "Bestaande transportbonnen:",
        fr: "Bonnes de livraison existants:",
        en: "Existing deliveryslips:"
    },
    titleCurrentSelection:
    {
        nl: "Huidige selectie:",
        fr: "Sélection actuelle:",
        en: "Current selection:"
    },
    gridTitleAssembly:
    {
        nl: "Merk",
        fr: "Assemblage",
        en: "Assembly"
    },
    gridTitleWeight:
    {
        nl: "Massa [kg]",
        fr: "Masse [kg]",
        en: "Mass [kg]"
    },
    gridTitleTotalPieces:
    {
        nl: "Totaal atl:",
        fr: "Total:",
        en: "Total:"
    },
    gridTitleTotalWeight:
    {
        nl: "Totale gewicht:",
        fr: "Masse totale:",
        en: "Total mass:"
    },
    gridUnitNumber:
    {
        nl: "stuks",
        fr: "pièces",
        en: "pieces"
    },
    phOdooSearch:
    {
        nl: "Voorbeeld: PV1 FM* V1 PS1+2 BV1-10 GU1.5-1.20 BS1.1+3.1",
        fr: "Exemple: PV1 FM* V1 PS1+2 BV1-10 GU1.5-1.20 BS1.1+3.1",
        en: "Example: PV1 FM* V1 PS1+2 BV1-10 GU1.5-1.20 BS1.1+3.1"
    },
    btnGetOdooInfo:
    {
        nl: "Toon Odoo gegevens",
        fr: "Afficher les données Odoo",
        en: "Show Odoo data"
    },
    textGuid:
    {
        nl: "GUID",
        fr: "GUID",
        en: "GUID"
    },
    textNaam:
    {
        nl: "Merknaam",
        fr: "Nom d'assemblage",
        en: "Assemblyname"
    },
    textDateDrawn:
    {
        nl: "Datum getekend",
        fr: "Date dessiné",
        en: "Date drawn"
    },
    textDatePlanned:
    {
        nl: "Datum gepland",
        fr: "Date planifié",
        en: "Date planned"
    },
    textDateProductionStarted:
    {
        nl: "Datum productie gestart",
        fr: "Date debut production",
        en: "Date production started"
    },
    textDateDemoulded:
    {
        nl: "Datum ontkist",
        fr: "Date décoffrage",
        en: "Date demoulded"
    },
    textDateProductionEnded:
    {
        nl: "Datum productie beëindigd",
        fr: "Date production terminée",
        en: "date production ended"
    },
    textDateTransported:
    {
        nl: "Datum getransporteerd",
        fr: "Date transporté",
        en: "Date transported"
    },
    textBin:
    {
        nl: "Bekisting",
        fr: "Coffrage",
        en: "Bin"
    },
    textProjectpart:
    {
        nl: "Projectonderdeel",
        fr: "Partie de projet",
        en: "Project part"
    },
    textMass:
    {
        nl: "Massa",
        fr: "Masse",
        en: "Mass"
    },
    textVolume:
    {
        nl: "Volume",
        fr: "Volume",
        en: "Volume"
    },
    textLength:
    {
        nl: "Lengte",
        fr: "Longeur",
        en: "Length"
    },
    textProfile:
    {
        nl: "Profiel",
        fr: "Profil",
        en: "Profile"
    },
    textFreight:
    {
        nl: "Vracht",
        fr: "Cargo",
        en: "Freight"
    },
    textNoInfoFound:
    {
        nl: "Merk bestaat niet op Odoo",
        fr: "Assemblage n'existe pas sur Odoo",
        en: "Assembly does not exist on Odoo"
    },
    titleAction4:
    {
        nl: "Actie 4: Toon info van gekende odoo merken",
        fr: "Action 4 : Afficher info des assemblages connus d'Odoo",
        en: "Action 4: Show Odoo data of known assemblies"
    },
};

var prefixDetails = [];

const prefixes = [
    'BD',
    'BF',
    'BH',
    'BP',
    'BS',
    'BV',
    'DEURKADER',
    'DG',
    'DORPEL',
    'DORPELBA',
    'FCITERNE',
    'FLIFT',
    'FM',
    'FPP',
    'FPV',
    'FSMEER',
    'FZ',
    'GI',
    'GU',
    'Hi',
    'Hm',
    'K',
    'KM',
    'KMZOOL',
    'KOKER',
    'KR',
    'KS',
    'KY',
    'LAADKADE',
    'LC',
    'LU',
    'LV',
    'LY',
    'MP',
    'Pi',
    'PLAAT',
    'Pm',
    'PORTIEK',
    'PP',
    'PS',
    'PV',
    'SK',
    'SL',
    'SPr',
    'SS',
    'TRAP',
    'TRAPBORDES',
    'TREKKER',
    'TRIB',
    'TT',
    'TTT',
    'VENSTERK',
    'VENTILA',
    'W',
    'WANDREGE',
];

//#endregion

//#region functions

//#region language related functions

function getUserLang() {
    var userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith("fr-"))
        userLang = "fr";
    return userLang;
}

function getTextById(id) {
    var userLang = getUserLang();
    if (textUi[id][userLang] !== undefined) {
        return textUi[id][userLang];
    }
    return textUi[id]["en"];
}

function setTextByLanguage() {
    var userLang = getUserLang();
    for (var key in textUi) {
        const div = document.getElementById(key);
        //console.log(key);
        //console.log(textUi[key]);
        //console.log(textUi[key][userLang]);
        if (div != null && textUi[key][userLang] !== undefined) {
            div.textContent = textUi[key][userLang];
        }
    }
}

//#endregion

function addASecond(s) {
    var dateS = getDateAndTimeFromString(s);
    dateS = new Date(dateS.setSeconds(dateS.getSeconds() + 1));
    return getStringFromDate(dateS);
}

async function addTextMarkups() {
    try {
        var possibleSelectBoxValues = getLabelContentTypes();
        var selectedItem = labelContentSelectBox.dxSelectBox("instance").option("selectedItem");

        var nmbrOfAssembliesFound = 0;
        let jsonArray = "[";

        const selection = await API.viewer.getSelection();
        for (var moi of selection) //doesn't work??
            moi.recursive = true;
        const selector = {
            modelObjectIds: selection
        };
        var mobjectsArr = await API.viewer.getObjects(selector);
        const modelspecs = await API.viewer.getModels();

        if (selectedItem === possibleSelectBoxValues[2]) {
            //recursive doesn't work => 'temporary' workaround 
            var hefoogPropSelector = getPropSelectorByPropnameAndValue("Default.MERKPREFIX", "HEFOOG");
            mobjectsArr = await API.viewer.getObjects(hefoogPropSelector);
        }
        //mobjectsArr type: ModelObjects[]
        //haalt enkel gemeenschappelijk hebben property sets op
        for (const mobjects of mobjectsArr) {
            const modelspec = modelspecs.find(s => s.id === mobjects.modelId);
            const modelPos = modelspec.placement.position;
            //mobjects type: ModelObjects met mobjects.objects type: ObjectProperties[]
            const objectsIds = mobjects.objects.map(o => o.id);
            //const objectsRuntimeIds = await API.viewer.convertToObjectRuntimeIds(mobjects.modelId, objectsIds);
            const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
            for (const objproperties of objPropertiesArr) {
                //objproperties type: ObjectProperties
                var defaultProperties = objproperties.properties.find(p => p.name === "Default");
                if (defaultProperties == undefined)
                    continue;
                var cogX = defaultProperties.properties.find(x => x.name === "COG_X");
                var cogY = defaultProperties.properties.find(x => x.name === "COG_Y");
                var cogZ = defaultProperties.properties.find(x => x.name === "COG_Z");
                if (cogX == undefined || cogX == undefined || cogX == undefined)
                    continue;

                var color = { r: 60, g: 203, b: 62, a: 255 };
                var coordinates = { x: modelPos.x + cogX.value, y: modelPos.y + cogY.value, z: modelPos.z + cogZ.value };
                var labelText = "";
                if (selectedItem === possibleSelectBoxValues[0]) {
                    var assemblyPos = defaultProperties.properties.find(x => x.name === "MERKNUMMER").value;
                    if (assemblyPos != undefined)
                        labelText = assemblyPos;
                    else
                        continue;
                }
                else if (selectedItem === possibleSelectBoxValues[1]) {
                    var cableLength = defaultProperties.properties.find(x => x.name === "CABLE_LENGTH");
                    if (cableLength != undefined)
                        labelText = cableLength.value;
                    else
                        continue;
                }
                else if (selectedItem === possibleSelectBoxValues[2]) {
                    var leftRight = defaultProperties.properties.find(x => x.name === "COMMENT");
                    if (leftRight != undefined)
                        labelText = leftRight.value;
                    else
                        continue;
                }

                if (labelText != "") {
                    jsonArray += getMarkupJson(color, coordinates, mobjects.modelId, objproperties.id, labelText) + ",";
                    nmbrOfAssembliesFound++;
                }
            }
        }
        jsonArray = jsonArray = jsonArray.slice(0, -1);
        jsonArray += "]";
        await API.markup.removeMarkups();
        if (nmbrOfAssembliesFound > 0) {
            await API.markup.addTextMarkup(JSON.parse(jsonArray));
        }
        else {
            DevExpress.ui.notify("No relevant assemblies found to add labels.");
        }
    }
    catch (e) {
        DevExpress.ui.notify(e);
    }
}

async function setAccesBooleans() {
    try {
        var token = await getToken();

        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "vpb.delivery.slip",
                domain: '[["id", ">", "-1"]]',
                limit: 1,
                fields: '["id"]'
            },
            success: function () {
                hasAccesToTransport = true;
                var username = odooUsernameTextbox.dxTextBox("instance").option("value");
                if (username == 'krecour' || username == 'mhemeryck' || username == 'jrodenbach' || username == 'sys_mrp_user')
                    hasAccesToFreights = true;
            }
        });

        hasAccesToProduction = true;
    }
    catch (ex) {

    }
    return false;
}

async function checkAssemblySelection() {
    const settings = await API.viewer.getSettings();
    if (!settings.assemblySelection) {
        DevExpress.ui.notify(getTextById("errorMsgNoAssemblySelection"));
    }
}

function clearObjectStatusesGuids() {
    for (var os of objectStatuses) {
        os.Guids = [];
        os.CompressedIfcGuids = [];
    }
}

async function doObjectsFilter(action) {
    return doWorkRes("#objectsResult", "#objectsLoading", action);
}

async function doWorkRes(selResult, selLoading, action) {
    return doWorkSafe(() => { //preaction
        $(selResult).html(""); //inhoud van selResult leegmaken
        $(selLoading).show(); //selLoading zichtbaar maken
    }, action, r => { //action , postaction
        $(selLoading).hide();
        $(selResult).html(r);
    });
}

async function doWorkSafe(preAction, action, postAction) {
    preAction();
    let result;
    try {
        const actionRes = await action();
        if (actionRes === false) {
            throw new Error("Operation failed: Unknown error");
        } else if (actionRes === true || actionRes === "" || actionRes == null) {
            result = ok();
        } else {
            result = actionRes;
        }
    }
    catch (e) {
        result = err(e);
    }
    postAction(result);
}

function fillObjectStatuses() {
    var modelled = {
        Status: StatusModelled,
        Color: { r: 211, g: 211, b: 211 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(modelled);

    var existing = {
        Status: StatusExisting,
        Color: { r: 130, g: 92, b: 79 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(existing);

    var drawn = {
        Status: StatusDrawn,
        Color: { r: 221, g: 160, b: 221 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(drawn);

    var onHold = {
        Status: StatusOnHold,
        Color: { r: 255, g: 0, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(onHold);

    var planned = {
        Status: StatusPlanned,
        Color: { r: 255, g: 140, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(planned);

    var demoulded = {
        Status: StatusDemoulded,
        Color: { r: 128, g: 128, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(demoulded);

    var prodEnded = {
        Status: StatusProductionEnded,
        Color: { r: 255, g: 255, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(prodEnded);

    var availForTransport = {
        Status: StatusAvailableForTransport,
        Color: { r: 0, g: 128, b: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(availForTransport);

    var plannedForTransport = {
        Status: StatusPlannedForTransport,
        Color: { r: 0, g: 255, b: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(plannedForTransport);

    var transported = {
        Status: StatusTransported,
        Color: { r: 34, g: 177, b: 76 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(transported);
}

async function fillPrefixDetails() {
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "cust.prefix_to_ce",
            domain: '[["id", ">", "-1"]]',
            fields: '["id", "name", "product_id", "shortcode"]',
        },
        success: function (data) {
            for (var record of data) {
                prefixDetails.push({
                    Prefix: record.name,
                    ShortPrefix: record.shortcode,
                    Id: record.id,
                    ProductId: record.product_id[0],
                });
            }
        }
    });
    //console.log(prefixDetails);
}

function getAssemblyPosNmbrFromSteelname(steelName) {
    var pos = steelName.substring(steelName.lastIndexOf(".") + 1);
    pos = pos.substring(0, pos.indexOf("\/"));
    pos = pos.replace(/^0+/, "");
    return pos;
}

async function getAssemblyNamesByCompressedGuids(compressedGuids) {
    var assemblies = [];

    //Authenticate with MUK API
    var token = await getToken();

    //Get project name
    var projectNumber = await getProjectNumber();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    if (prefixDetails.length == 0) {
        await fillPrefixDetails();
    }

    //console.log(prefixDetails);

    for (var i = 0; i < compressedGuids.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
        var domainTrimbleConnectMain = "";

        for (var j = i; j < compressedGuids.length && j < i + fetchLimit; j++) {
            var fullGuid = Guid.fromCompressedToFull(compressedGuids[j]);
            var filterArrStr = '["name", "ilike", "' + fullGuid + '"]';
            if (j > i) {
                domainTrimbleConnectMain = '"|", ' + filterArrStr + ',' + domainTrimbleConnectMain;
            }
            else {
                domainTrimbleConnectMain = filterArrStr;
            }
        }

        domainTrimbleConnectMain = '[["project_id.id", "=", "' + projectId + '"],' + domainTrimbleConnectMain + ']';
        var assemblyIds = [];
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: domainTrimbleConnectMain,
                fields: '["id", "name", "rank", "mark_id"]',
            },
            success: function (odooData) {
                for (var record of odooData) {
                    var odooAssemblyStr = record.mark_id[1];
                    var splitStr = odooAssemblyStr.split(".");
                    var shortPrefix = removeLeadingZeroes(splitStr[1]);
                    var longPrefix = prefixDetails.find(x => x.ShortPrefix === shortPrefix).Prefix;
                    var posNmbr = removeLeadingZeroes(splitStr[2]);
                    assemblies.push(
                        {
                            AssemblyName: longPrefix + posNmbr + "." + record.rank,
                            Guid: record.name,
                            AssemblyId: record.mark_id[0],
                            AssemblyQuantity: 0
                        });
                    assemblyIds.push(record.mark_id[0]);
                }
            }
        });

        assemblyIds = [...new Set(assemblyIds)]; //remove duplicate items
        var domainMasterMarks = "";
        for (var j = 0; j < assemblyIds.length; j++) {
            var filterArrStr = '["id", "=", "' + assemblyIds[j] + '"]';
            if (j > 0) {
                domainMasterMarks = '"|", ' + filterArrStr + ',' + domainMasterMarks;
            }
            else {
                domainMasterMarks = filterArrStr;
            }
        }
        domainMasterMarks = '[' + domainMasterMarks + ']';
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "project.master_marks",
                domain: domainMasterMarks,
                fields: '["id", "mark_qty"]',
            },
            success: function (odooData) {
                for (var record of odooData) {
                    var assembliesWithMarkId = assemblies.filter(x => x.AssemblyId == record.id);
                    for (var assembly of assembliesWithMarkId) {
                        assembly.AssemblyQuantity = record.mark_qty;
                    }
                }
            }
        });
    }

    return assemblies;
}

function getColorByStatus(status) {
    var color = { r: 211, g: 211, b: 211 };
    var ostat = objectStatuses.find(o => o.Status === status);
    if (ostat !== undefined)
        color = ostat.Color;
    return color;
}

function getColorString(color) {
    return "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
}

function getDateAndTimeFromString(s) {
    var date = null;
    var resultDate = s.match(regexDateAndTime);
    if (resultDate != null) {
        var splitDateTime = resultDate[0].split(" ");
        var splitDate = splitDateTime[0].split("-");
        var splitTime = splitDateTime[1].split(":");
        var year = splitDate[0];
        var month = splitDate[1];
        var day = splitDate[2];
        var hours = splitTime[0];
        var minutes = splitTime[1];
        var seconds = splitTime[2];
        date = new Date(year, month - 1, day, hours, minutes, seconds);
    }
    return date;
}

function getDateFromString(s) {
    var date = null;
    var resultDate = s.match(regexDate);
    if (resultDate != null) {
        var splitDate = resultDate[0].split("-");
        var year = splitDate[0];
        var month = splitDate[1];
        var day = splitDate[2];
        date = new Date(year, month - 1, day);
    }
    return date;
}

function getDateShortString(date) {
    var mm = date.getMonth() + 1; // getMonth() is zero-based
    var dd = date.getDate();
    var dayName = date.toLocaleDateString(getUserLang(), { weekday: 'long' });
    return dayName + " " + [(dd > 9 ? '' : '0') + dd, (mm > 9 ? '' : '0') + mm, date.getFullYear(),].join('-');
};

function getFilterTypes() {
    var userLang = getUserLang();
    if (filterTypes[userLang] !== undefined) {
        return filterTypes[userLang];
    }
    else {
        return filterTypes.en;
    }
}

function getLabelContentTypes() {
    var userLang = getUserLang();
    if (labelContentTypes[userLang] !== undefined) {
        return labelContentTypes[userLang];
    }
    else {
        return labelContentTypes.en;
    }
}

function getLabelContentOdooTypes() {
    var userLang = getUserLang();
    if (labelContentTypesOdoo[userLang] !== undefined) {
        return labelContentTypesOdoo[userLang];
    }
    else {
        return labelContentTypesOdoo.en;
    }
}

function getMarkupJson(color, coordinates, modelId, objectId, text) {
    var json =
        `{
            "color":
            {
                "r": ${color.r},
                "g": ${color.g},
                "b": ${color.b},
                "a": ${color.a}
            },
            "start":
            {
                "positionX": ${coordinates.x},
                "positionY": ${coordinates.y},
                "positionZ": ${coordinates.z},
                "modelId": "${modelId}",
                "objectId": ${objectId}
            },
            "end":
            {
                "positionX": ${coordinates.x},
                "positionY": ${coordinates.y},
                "positionZ": ${coordinates.z},
                "objectId": null
            },
            "text": "${text}"
        }`;
    return json;
}

function getPosAndRank(str, isStart) {
    var pos = -1;
    var rank = -1;
    if (str.includes(".")) {
        var splitStr = str.split(".");
        pos = splitStr[0];
        rank = splitStr[1];
    }
    else {
        pos = str;
        rank = isStart ? 1 : maxRank;
    }

    return { Pos: pos, Rank: rank };
}

function getPrefix(steelName) {
    var prefix = steelName.substring(steelName.indexOf(".") + 1);
    prefix = prefix.substring(0, prefix.indexOf("."));
    prefix = prefix.replace(/^0+/, "");
    return prefix;
}

async function getProjectNumber() {
    //Get project name
    var regexProjectName = /^[TV]\d+_\w+/;
    var project = await API.project.getProject();//{ name: "V8597_VDL" };//
    //debugInfo = debugInfo.concat("<br />Project name: " + project.name);
    //$(debug).html(debugInfo);
    if (!regexProjectName.test(project.name))
        return undefined;
    else
        return project.name.split("_")[0];
}

async function getObjectsByProp(e) {
    return getObjectsBy(async () => API.viewer.getObjects(getPropSelector()), e);
}

function getOdooAssemblyUrl(assemblyId) {
    return `${odooURL}/web#id=${assemblyId}&active_id=2260&model=project.master_marks&view_type=form&cids=1&menu_id=2270`;
}

function getOdooDrawingUrl(projectNumber, drawingName) {
    return `${odooURL.replace('https', 'http')}:8080/bib/${projectNumber}/merken/${drawingName}`;
}

function getOdooSlipUrl(slipId) {
    return `${odooURL}/web#id=${slipId}&action=3552&model=vpb.delivery.slip&view_type=form&cids=1&menu_id=2270`;
}

function getPropSelector() {
    return {
        parameter: {
            properties: {
                [$("#propNameFilter").val()]: $("#propValueFilter").val()
            }
        }
    };
}

function getPropSelectorByPropnameAndValue(propNameFilter, propValueFilter) {
    return {
        parameter: {
            properties: {
                [propNameFilter]: propValueFilter
            }
        }
    };
}

function getQueryGroupItem(prefix, start, end) {
    return {
        Prefix: prefix.toUpperCase(),
        StartPos: start.Pos,
        StartRank: start.Rank,
        EndPos: end.Pos,
        EndRank: end.Rank,
    };
}

function getQueryGroupItemByPrefix(prefix) {
    return {
        Prefix: prefix.toUpperCase(),
        StartPos: 1,
        StartRank: 1,
        EndPos: 99999,
        EndRank: maxRank,
    };
}

function getStatus(record, referenceDate) {
    if (typeof record.state === 'string' && record.state === 'onhold') {
        return StatusOnHold;
    }
    else if (typeof record.date_transported === 'string' && getDateFromString(record.date_fab_dem) <= referenceDate) {
        return StatusTransported;
    }
    else if (typeof record.date_fab_end === 'string' && getDateFromString(record.date_fab_end) <= referenceDate) {
        if (record.mark_available) {
            return StatusAvailableForTransport;
        }
        else {
            return StatusProductionEnded;
        }
    }
    else if (typeof record.date_fab_dem === 'string' && getDateFromString(record.date_fab_dem) <= referenceDate) {
        return StatusDemoulded;
    }
    else if (typeof record.date_fab_planned === 'string' && getDateFromString(record.date_fab_planned) <= referenceDate) {
        return StatusPlanned;
    }
    else if (typeof record.date_drawn === 'string' && getDateFromString(record.date_drawn) <= referenceDate) {
        return StatusDrawn;
    }
    else {
        return StatusModelled;
    }
}

function getStringFromDate(d) {
    var year = d.getFullYear();
    var month = pad("00", d.getMonth() + 1);
    var day = pad("00", d.getDate());
    var hours = pad("00", d.getHours());
    var minutes = pad("00", d.getMinutes());
    var seconds = pad("00", d.getSeconds());
    var returnstr = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
    return returnstr;
}

async function onlyShowStatus(status) {
    try {
        const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
        for (const mobjects of mobjectsArr) {
            var modelId = mobjects.modelId;
            const objectsRuntimeIds = mobjects.objects.map(o => o.id);
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });

            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, objectStatuses.find(o => o.Status === status).CompressedIfcGuids);
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { visible: true });
        }
    }
    catch (e) {
        DevExpress.ui.notify(e);
    }
}

function pad(pad, str) {
    if (typeof str === 'undefined')
        return pad;
    return (pad + str).slice(-pad.length);
}

const popupContentTemplate = function () {
    if (odooAssemblyData != null && odooAssemblyData != undefined) {
        var odooContent = $(`<p><a href="${getOdooAssemblyUrl(odooAssemblyData.OdooPmmId)}" target="_blank" rel="noopener noreferrer">Odoo</a>`);
        odooContent.append('- Tekeningen: ');
        for (var url of odooAssemblyData.DrawingsUrls) {
            odooContent.append($(`<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="images/Drawing.png" width="16" height="16"></a>`));
        }
        odooContent.append(`</p>`);
        var content = $('<div>').append(
            odooContent,
            $(`<p>${getTextById("textNaam")}: <span>${odooAssemblyData.AssemblyName}</span></p>`),
            $(`<p>${getTextById("textDateDrawn")}: <span>${odooAssemblyData.DateDrawn}</span></p>`),
            $(`<p>${getTextById("textDatePlanned")}: <span>${odooAssemblyData.DateProductionPlanned}</span></p>`),
            $(`<p>${getTextById("textDateProductionStarted")}: <span>${odooAssemblyData.DateProductionStarted}</span></p>`),
            $(`<p>${getTextById("textDateDemoulded")}: <span>${odooAssemblyData.DateDemoulded}</span></p>`),
            $(`<p>${getTextById("textDateProductionEnded")}: <span>${odooAssemblyData.DateProductionEnded}</span></p>`),
            $(`<p>${getTextById("textDateTransported")}: <span>${odooAssemblyData.DateTransported}</span></p>`),
            $(`<p>${getTextById("textBin")}: <span>${odooAssemblyData.Bin}</span></p>`),
            $(`<p>${getTextById("textProjectpart")}: <span>${odooAssemblyData.Unit}</span></p>`),
            $(`<p>${getTextById("textMass")} [kg]: <span>${odooAssemblyData.Mass}</span></p>`),
            $(`<p>${getTextById("textVolume")} [m³]: <span>${odooAssemblyData.Volume}</span></p>`),
            $(`<p>${getTextById("textLength")} [mm]: <span>${odooAssemblyData.Length}</span></p>`),
            $(`<p>${getTextById("textProfile")}: <span>${odooAssemblyData.Profile}</span></p>`),
            $(`<p>${getTextById("textFreight")}: <span>${odooAssemblyData.Freight}</span></p>`),
        );
        if (odooAssemblyData.CableLength != undefined && odooAssemblyData.CableLength !== "") {
            content.append($(`<p>Cable length: <span>${odooAssemblyData.CableLength}</span></p>`));
        }
        return content;
    }
    else {
        return $('<div>').append(
            $(`<p>${getTextById("textNoInfoFound")}</p>`),
        );
    }
};

function removeLeadingZeroes(stringwithzeroes) {
    return stringwithzeroes.replace(/^0+/, "");
}

async function setObjectsByProp() {
    return doObjectsFilter(async () => API.viewer.setSelection(getPropSelector(), "set"));
}

async function setObjectsByProp2() {
    await API.viewer.setSelection(getPropSelector(), "set");
}

async function setObjectSelectionByPropnameAndValue(propNameFilter, propValueFilter, selectionType) {
    await API.viewer.setSelection(getPropSelectorByPropnameAndValue(propNameFilter, propValueFilter), selectionType);
}

async function setSelectionByFilter() {
    performSelectionChanged = false;
    //await setObjectSelectionByPropnameAndValue("Tekla Common.Finish", "MONTAGE", "add");

    var filterTypes = getFilterTypes();
    var selectedItem = filterTypeSelectBox.dxSelectBox("instance").option("selectedItem");
    if (selectedItem === filterTypes[0]) {
        var selected = prefixSelectionTagBox.dxTagBox("instance").option("selectedItems");
        performSelectionChanged = false;
        for (let i = 0; i < selected.length; i++) {
            var actionType = i == 0 ? "set" : "add";
            //console.log("selecting " + actionType + " " + selected[i]);
            if (i == selected.length - 1) {
                performSelectionChanged = true;
            }
            //console.log("setObjectSelectionByPropnameAndValue");
            await setObjectSelectionByPropnameAndValue("Default.MERKPREFIX", selected[i], actionType);
        }
    }
    else if (selectedItem === filterTypes[1]) {
        var text = assemblyTextBox.dxTextBox("instance").option("value");
        performSelectionChanged = true;
        //console.log("setObjectSelectionByPropnameAndValue");
        await setObjectSelectionByPropnameAndValue("Default.MERKNUMMER", text, "set");
    }
    else if (selectedItem === filterTypes[2]) {
        var propertyName = propertyNameTextBox.dxTextBox("instance").option("value");
        var propertyValue = propertyValueTextBox.dxTextBox("instance").option("value");
        performSelectionChanged = true;
        //console.log("setObjectSelectionByPropnameAndValue");
        await setObjectSelectionByPropnameAndValue(propertyName, propertyValue, "set");
    }
    performSelectionChanged = true;
}

async function setVisibility(status, visibility) {
    try {
        const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
        for (const mobjects of mobjectsArr) {
            var modelId = mobjects.modelId;
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, objectStatuses.find(o => o.Status === status).CompressedIfcGuids);
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { visible: visibility });
        }
    }
    catch (e) {
        DevExpress.ui.notify(e);
    }
}

async function viewChanged(data) {
    console.log(data);
}

async function selectionChanged(data) {
    odooAssemblyData = undefined;
    popup.hide();

    if (!hasAccesToTransport && !hasAccesToFreights)
        return;

    await checkAssemblySelection();

    var mySelectionId = ++lastSelectionId;
    selectionChangedIds.push(mySelectionId);
    if (!performSelectionChanged) {
        //console.log("performSelectionChanged " + performSelectionChanged + " => selectionChanged skipped");
        return;
    }

    if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
    //console.log("performSelectionChanged " + performSelectionChanged + " => selectionChanged passed");
    var tempSelectedObjects = [];
    //console.log(data);
    try {
        for (const mobjects of data) {
            var modelId = mobjects.modelId;
            //runtimeIds = [17062, 17065, ...] = ids used by viewer
            //objectIds = compressed IFC guids = ['28DCGNPlH98vcQNyNhB4sQ', '0fKOmd_6PFgOiexu4H1vtU', ...] = can be used to map runtimeId to original IFC
            const objectsRuntimeIds = mobjects.objectRuntimeIds;
            //console.log("objectsRuntimeIds");
            //console.log(objectsRuntimeIds);
            if (objectsRuntimeIds.length == 0)
                continue;
            const objectIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);
            //console.log("objectIds");
            //console.log(objectIds);
            for (var i = 0; i < objectsRuntimeIds.length; i++) {
                tempSelectedObjects.push({
                    ModelId: modelId,
                    ObjectRuntimeId: objectsRuntimeIds[i],
                    ObjectId: objectIds[i],
                    Guid: Guid.fromCompressedToFull(objectIds[i]),
                    OdooTcmId: -1,
                    OdooPmmId: -1,
                    Weight: 0,
                    Prefix: "",//voor sorteren
                    PosNmbr: 0,
                    Rank: 0,
                    AssemblyName: "",
                    AvailableForTransport: false,
                    DateTransported: "",
                    Valid: false,
                    Profile: "",
                    ReinforcementType: "",
                    SlipName: "",
                    OdooSlipId: -1,
                });
            }
        }
        //console.log("tempSelectedObjects");
        //console.log(tempSelectedObjects);

        if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
        //Get project name
        var projectNumber = await getProjectNumber();
        if (projectNumber == undefined)
            return;

        //Authenticate with MUK API
        var token = await getToken();

        //Get project ID
        var projectId = await GetProjectId(projectNumber);

        var referenceDate = new Date();
        referenceDate.setHours(23);
        referenceDate.setMinutes(59);
        referenceDate.setSeconds(59);

        for (var i = 0; i < tempSelectedObjects.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
            if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
            var domainTrimbleConnectMain = "";

            for (var j = i; j < tempSelectedObjects.length && j < i + fetchLimit; j++) {
                var filterArrStr = '["name", "ilike", "' + tempSelectedObjects[j].Guid + '"]';
                if (j > i) {
                    domainTrimbleConnectMain = '"|", ' + filterArrStr + ',' + domainTrimbleConnectMain;
                }
                else {
                    domainTrimbleConnectMain = filterArrStr;
                }
            }
            //adding project_id to the query reduces the time it takes to find the records
            //based on seeing how fast the grid refreshes with and w/o project_id, should properly time the difference to verify.
            //should also try this with other queries that use ilike
            domainTrimbleConnectMain = '[["project_id.id", "=", "' + projectId + '"],' + domainTrimbleConnectMain + "]";
            //console.log("domainTrimbleConnectMain");
            //console.log(domainTrimbleConnectMain);
            var domainProjectMarks = "";
            var recordsAdded = 0;
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "trimble.connect.main",
                    domain: domainTrimbleConnectMain,
                    fields: '["id", "mark_id", "name", "rank", "mark_available", "date_transported"]',
                },
                success: function (odooData) {
                    //console.log("trimble.connect.main");
                    //console.log(odooData);
                    var cntr = 0;
                    for (var record of odooData) {
                        var filterArrStr = '["id", "=", "' + record.mark_id[0] + '"]';
                        if (cntr > 0) {
                            domainProjectMarks = '"|", ' + filterArrStr + ',' + domainProjectMarks;
                        }
                        else {
                            domainProjectMarks = filterArrStr;
                        }
                        var selectedObject = tempSelectedObjects.find(x => x.Guid === record.name);
                        if (selectedObject != undefined) {
                            selectedObject.OdooTcmId = record.id;
                            selectedObject.OdooPmmId = record.mark_id[0];
                            selectedObject.Rank = record.rank;
                            selectedObject.OdooCode = record.mark_id[1];
                            selectedObject.DateTransported = record.date_transported ? getDateFromString(record.date_transported) : "";
                            selectedObject.AvailableForTransport = record.mark_available;
                        }
                        cntr++;
                        recordsAdded++;
                    }
                    //don't think project_id would make this query faster since it's an exact id is given
                    domainProjectMarks = "[" + domainProjectMarks + "]";
                }
            });
            if (recordsAdded > 0) {
                //console.log("domainProjectMarks");
                //console.log(domainProjectMarks);
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "project.master_marks",
                        domain: domainProjectMarks,
                        fields: '["id", "mark_mass", "mark_ranking", "mark_prefix", "mark_reinf_type", "mark_profile"]',
                    },
                    success: function (odooData) {
                        //console.log("project.master_marks");
                        //console.log(odooData);
                        for (var record of odooData) {
                            var objects = tempSelectedObjects.filter(x => x.OdooPmmId == record.id);
                            for (var object of objects) {
                                object.Weight = record.mark_mass;
                                object.PosNmbr = record.mark_ranking;
                                object.Prefix = record.mark_prefix;
                                object.AssemblyName = record.mark_prefix + record.mark_ranking + "." + object.Rank;
                                object.Valid = object.AvailableForTransport && object.DateTransported === "";
                                object.Profile = record.mark_profile;
                                object.ReinforcementType = record.mark_reinf_type ? record.mark_reinf_type : "";
                            }
                        }
                    }
                });

                var transportedObjects = tempSelectedObjects.filter(x => !x.Valid);
                //console.log("transportedObjects: ");
                //console.log(transportedObjects);
                for (var k = 0; k < transportedObjects.length; k += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
                    var domainSliplines = "";

                    for (var l = k; l < transportedObjects.length && l < k + fetchLimit; l++) {
                        var filterArrStr = `["trimble_connect_id.id", "=", "${transportedObjects[l].OdooTcmId}"]`;
                        if (l > k) {
                            domainSliplines = '"|", ' + filterArrStr + ',' + domainSliplines;
                        }
                        else {
                            domainSliplines = filterArrStr;
                        }
                    }
                    domainSliplines = "[" + domainSliplines + "]";
                    //console.log("domainSliplines: ");
                    //console.log(domainSliplines);

                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "vpb.delivery.slip.line",
                            domain: domainSliplines,
                            fields: '["id", "slip_id", "trimble_connect_id", "name"]',
                        },
                        success: function (odooData) {
                            //console.log("odooData sliplines: ");
                            //console.log(odooData);
                            for (var record of odooData) {
                                var object = tempSelectedObjects.find(x => x.OdooTcmId == record.trimble_connect_id[0]);
                                //console.log("object: ");
                                //console.log(object);
                                if (object != undefined) {
                                    object.OdooSlipId = record.slip_id[0];
                                    object.SlipName = record.slip_id[1];
                                }
                            }
                        }
                    });
                }
                
                //var objectsOnSlips = [...new Set(tempSelectedObjects.filter(x => x.OdooSlipId != -1))];
                //for (var k = 0; k < objectsOnSlips.length; k += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
                //    var domainSlips = "";

                //    for (var l = k; l < objectsOnSlips.length && l < k + fetchLimit; l++) {
                //        var filterArrStr = `'["id", "=", "${objectsOnSlips[l].OdooSlipId}"]`;
                //        if (l > k) {
                //            domainSlips = '"|", ' + filterArrStr + ',' + domainSlips;
                //        }
                //        else {
                //            domainSlips = filterArrStr;
                //        }
                //    }

                //    await $.ajax({
                //        type: "GET",
                //        url: odooURL + "/api/v1/search_read",
                //        headers: { "Authorization": "Bearer " + token },
                //        data: {
                //            model: "vpb.delivery.slip",
                //            domain: domainSlips,
                //            fields: '["id", "name"]',
                //        },
                //        success: function (odooData) {
                //            for (var record of odooData) {
                //                var objects = tempSelectedObjects.filter(x => x.OdooSlipId == record.id);
                //                for (var object of objects) {
                //                    object.SlipName = record.name;
                //                }
                //            }
                //        }
                //    });
                //}
            }
            else {
                //console.log("no records found in trimble.connect.main");
            }
        }
        if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
        //console.log("tempSelectedObjects2");
        //console.log(tempSelectedObjects);
        selectedObjects.length = 0;
        //for (var o of tempSelectedObjects)
        //    selectedObjects.push(o);
        selectedObjects.push(...tempSelectedObjects);
        dataGridTransport.dxDataGrid("refresh");
        dataGridProduction.dxDataGrid("refresh");

        if (resetSlipDropdown) {
            var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
            instanceDropDown.reset();
        }
        resetSlipDropdown = true;
    }
    catch (e) {
        console.log(e);
    }
    performSelectionChanged = true;
}

async function refreshExistingSlips() {
    try {
        //Get project name
        var projectNumber = await getProjectNumber();
        if (projectNumber == undefined)
            return;

        //Authenticate with MUK API
        var token = await getToken();

        //Get project ID
        var id = await GetProjectId(projectNumber);

        var tempExistingSlips = [];
        var lineIds = [];
        var ended = 0;
        var lastId = -1;
        while (ended != 1) { //loop cuz only fetchLimit records get fetched at a time
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "vpb.delivery.slip",
                    //, ["state", "=", "draft"]
                    domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"]]',
                    fields: '["id", "name", "line_ids", "state", "date"]',
                    order: 'id',
                },
                success: function (data) {
                    if (data.length == 0) { //no more records
                        ended = 1;
                        return;
                    }
                    for (const record of data) {
                        lastId = record.id;
                        tempExistingSlips.push({
                            OdooId: record.id,
                            State: record.state,
                            Name: record.name,
                            Guids: [],
                            OdooLineIds: record.line_ids,
                            AssemblyNames: "",
                            Date: record.date ? getDateFromString(record.date) : "",
                        });
                        if (record.line_ids.length > 0) {
                            lineIds.push(...record.line_ids);
                        }
                    }
                }
            });
        }

        for (var i = 0; i < lineIds.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
            var domainSliplines = "";

            for (var j = i; j < lineIds.length && j < i + fetchLimit; j++) {
                var filterArrStr = '["id", "=", "' + lineIds[j] + '"]';
                if (j > i) {
                    domainSliplines = '"|", ' + filterArrStr + ',' + domainSliplines;
                }
                else {
                    domainSliplines = filterArrStr;
                }
            }
            domainSliplines = "[" + domainSliplines + "]";
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "vpb.delivery.slip.line",
                    domain: domainSliplines,
                    fields: '["id", "slip_id", "trimble_connect_id", "name"]',
                },
                success: function (data) {
                    for (const record of data) {
                        var slip = tempExistingSlips.find(x => x.OdooId == record.slip_id[0]);
                        if (slip != undefined) {
                            slip.Guids.push(record.trimble_connect_id[1]);
                            slip.AssemblyNames += record.name + ", ";
                        }
                    }
                }
            });
        }

        existingSlips.length = 0;
        existingSlips.push(...tempExistingSlips);

        var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
        //console.log(instanceDropDown);
        //var previousIndex = instanceDropDown.option("value");
        var ds = instanceDropDown.getDataSource();
        ds.reload();
    }
    catch (ex) {
        console.log(ex);
    }
}

async function selectGuids(guids) {
    var validGuids = guids.filter(x => x != undefined && x !== "");
    if (validGuids.length == 0) {
        await API.viewer.setSelection(undefined, 'remove');
    }
    else {
        var models = await API.viewer.getModels("loaded");
        var compressedGuids = validGuids.map(x => Guid.fromFullToCompressed(x));
        //console.log(compressedGuids);
        var selectionType = "set";
        for (var model of models) {
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(model.id, compressedGuids);
            //console.log(runtimeIds);
            if (runtimeIds.length == 0)
                continue;
            var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: runtimeIds }] };
            await API.viewer.setSelection(selector, selectionType);
            selectionType = "add";
            //console.log("out of for");
        }
        //console.log("end");
    }
}

async function visualizeFreights() {
    //Get project name
    var projectNumber = await getProjectNumber();
    if (projectNumber == undefined)
        return;

    //Authenticate with MUK API
    var token = await getToken();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    //Get freightnumber per element
    var freights = [];
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "trimble.connect.main",
            domain: '[["project_id.id", "=", "' + projectId + '"], ["freight", ">", "0"], ["mark_id.mark_prefix", "=", "W"]]',
            order: 'freight',
            fields: '["id", "name", "freight", "mark_id", "mark_available"]',
        },
        success: function (data) {
            for (const record of data) {
                var freight = freights.find(x => x.FreightNumber == record.freight);
                if (freight != undefined) {
                    if (record.mark_available)
                        freight.ObjectIdsAvailable.push(Guid.fromFullToCompressed(record.name));
                    else
                        freight.ObjectIdsUnavailable.push(Guid.fromFullToCompressed(record.name));
                    freight.MarkIds.push(record.mark_id[0]);
                }
                else {
                    var newFreight = {
                        FreightNumber: record.freight,
                        ObjectIdsAvailable: [],//objectIds = compressed ifc ids
                        ObjectRuntimeIdsAvailable: [],//o.id = runtimeId = number
                        ObjectIdsUnavailable: [],//objectIds = compressed ifc ids
                        ObjectRuntimeIdsUnavailable: [],//o.id = runtimeId = number
                        MarkIds: [record.mark_id[0]],
                        Surface: 0,
                    };
                    if(record.mark_available)
                        newFreight.ObjectIdsAvailable = [Guid.fromFullToCompressed(record.name)];//objectIds = compressed ifc ids
                    else
                        newFreight.ObjectIdsUnavailable = [Guid.fromFullToCompressed(record.name)];//objectIds = compressed ifc ids
                    freights.push(newFreight);
                }
            }
        }
    });

    var assemblyIds = [...new Set(freights.map(f => f.MarkIds).flat())];
    for (var i = 0; i < assemblyIds.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
        var domainMasterMarks = "";
        for (var j = i; j < assemblyIds.length && j < i + fetchLimit; j++) {
            var filterArrStr = '["id", "=", "' + assemblyIds[j] + '"]';
            if (j > i) {
                domainMasterMarks = '"|", ' + filterArrStr + ',' + domainMasterMarks;
            }
            else {
                domainMasterMarks = filterArrStr;
            }
        }
        domainMasterMarks = '[' + domainMasterMarks + ']';
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "project.master_marks",
                domain: domainMasterMarks,
                fields: '["id", "mark_surface"]',
            },
            success: function (odooData) {
                for (var record of odooData) {
                    for (var f of freights) {
                        var markIdsInFreight = f.MarkIds.filter(x => x == record.id);
                        if (markIdsInFreight != undefined && markIdsInFreight.length > 0) {
                            f.Surface += markIdsInFreight.length * record.mark_surface * 1000000;
                        }
                    }
                }
            }
        });
    }

    await API.markup.removeMarkups();
    var jsonArray = "";
    var models = await API.viewer.getModels("loaded");
    for (var model of models) {
        var modelId = model.id;
        for (var freight of freights) {
            var jsonFreight = "";

            var runtimeIdsAvailable = await API.viewer.convertToObjectRuntimeIds(modelId, freight.ObjectIdsAvailable);
            var runtimeIdsUnavailable = await API.viewer.convertToObjectRuntimeIds(modelId, freight.ObjectIdsUnavailable);

            var allRuntimeIds = [];
            if (runtimeIdsAvailable != undefined && runtimeIdsAvailable.length > 0) {
                runtimeIdsAvailable = runtimeIdsAvailable.filter(x => x != undefined);
                allRuntimeIds = allRuntimeIds.concat(runtimeIdsAvailable);
            }
            if (runtimeIdsUnavailable != undefined && runtimeIdsUnavailable.length > 0) {
                runtimeIdsUnavailable = runtimeIdsUnavailable.filter(x => x != undefined);
                allRuntimeIds = allRuntimeIds.concat(runtimeIdsUnavailable);
            }

            if (allRuntimeIds.length == 0)
                continue;
            
            var colorToUse = freightColors[freight.FreightNumber % freightColors.length];

            //Set element color per freight
            colorToUse.a = 255;
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsAvailable }] }, { color: colorToUse });
            colorToUse.a = 128;
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsUnavailable }] }, { color: colorToUse });

            //Add labels per freight
            var allCogCoordinates = [];
            const modelPos = model.placement.position;
            const objPropertiesArr = await API.viewer.getObjectProperties(modelId, allRuntimeIds);
            for (const objproperties of objPropertiesArr) {
                //objproperties type: ObjectProperties
                var defaultProperties = objproperties.properties.find(p => p.name === "Default");
                if (defaultProperties == undefined)
                    continue;
                var cogX = defaultProperties.properties.find(x => x.name === "COG_X");
                var cogY = defaultProperties.properties.find(x => x.name === "COG_Y");
                var cogZ = defaultProperties.properties.find(x => x.name === "COG_Z");
                if (cogX == undefined || cogX == undefined || cogX == undefined)
                    continue;

                var coordinates = { x: modelPos.x + cogX.value, y: modelPos.y + cogY.value, z: modelPos.z + cogZ.value };
                var labelText = freight.FreightNumber;
                jsonFreight += getMarkupJson(colorToUse, coordinates, modelId, objproperties.id, labelText) + ",";

                allCogCoordinates.push(coordinates);
            }
            var xValues = allCogCoordinates.map(c => c.x);
            var minX = Math.min(...xValues);
            var maxX = Math.max(...xValues);
            var deltaX = maxX - minX;
            var yValues = allCogCoordinates.map(c => c.y);
            var minY = Math.min(...yValues);
            var maxY = Math.max(...yValues);
            var deltaY = maxY - minY;
            var zValues = allCogCoordinates.map(c => c.z);
            var minZ = Math.min(...zValues);
            var maxZ = Math.max(...zValues);
            var deltaZ = maxZ - minZ;

            //console.log(freight);
            //console.log("freight.Surface: ");
            //console.log(freight.Surface);
            //console.log("deltaX * deltaY: ");
            //console.log(deltaX * deltaY);
            //console.log("deltaZ: ");
            //console.log(deltaZ);
            if (freight.Surface > deltaX * deltaY /*&& deltaZ <= 400*/
                && !(deltaX == 0 && deltaY / yValues > 1200) && !(deltaY == 0 && deltaX / xValues > 1200)) {
                var avgX = xValues.reduce((a, b) => a + b, 0) / xValues.length;
                var avgY = yValues.reduce((a, b) => a + b, 0) / yValues.length;
                var avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
                var coordinates = { x: avgX, y: avgY, z: avgZ };
                var labelText = freight.FreightNumber;
                jsonFreight = getMarkupJson(colorToUse, coordinates, modelId, allRuntimeIds[0], labelText) + ",";
            }
            jsonArray += jsonFreight;
        }
    }

    if (jsonArray.length > 0) {
        jsonArray = jsonArray.slice(0, -1);
        jsonArray = "[" + jsonArray + "]"
        await API.markup.addTextMarkup(JSON.parse(jsonArray));
    }
    else {
        DevExpress.ui.notify("Geen vrachten gevonden");
    }
}

//#region Odoo

var token = "";
var refresh_token = "";
var tokenExpiretime;
var client_id = "3oVDFZt2EVPhAOfQRgsRDYI9pIcdcdTGYR7rUSST";
var client_secret = "PXthv4zShfW5NORk4bKFgr6O1dlYTxqD8KwFlx1S";
async function getToken() {
    if (token !== "" && refresh_token !== "" && tokenExpiretime.getTime() < Date.now() + 60000) {
        console.log("Refreshing token");
        //console.log("tokenExpiretime.getTime()");
        //console.log(tokenExpiretime.getTime());
        //console.log("Date.now()");
        //console.log(Date.now());
        var refreshSuccesful = false;
        await $.ajax({
            type: "POST",
            url: odooURL + "/api/v1/authentication/oauth2/token",
            data: {
                client_id: client_id,
                client_secret: client_secret,
                grant_type: "refresh_token",
                refresh_token: refresh_token
            },
            success: function (odooData) {
                token = odooData.access_token;
                refresh_token = data.refresh_token;
                tokenExpiretime = new Date(Date.now() + data.expires_in * 1000);
                refreshSuccesful = true;
                console.log("refresh success");
            },
        });
        if (!refreshSuccesful) {
            token = "";
        }
        console.log("End refresh token");
    }
    if (token === "") {
        //console.log("Fetching token");
        var username = odooUsernameTextbox.dxTextBox("instance").option("value");
        var password = odooPasswordTextbox.dxTextBox("instance").option("value");
        if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
            console.log("no username and/or password found");
            throw "Gelieve gebruikersnaam en/of paswoord in te vullen.";
        }
        //console.log("Start db name fetch1");
        //await $.ajax({
        //    type: "GET",
        //    url: odooURL + "/api/v1/database",
        //    data: {
        //        db: odooDatabase
        //    },
        //    success: function (data) {
        //        console.log(data); 
        //    },
        //});
        //console.log("Einde db name fetch");
        await $.ajax({
            type: "POST",
            url: odooURL + "/api/v1/authentication/oauth2/token",
            data: {
                db: odooDatabase,
                username: username,
                password: password,
                client_id: client_id,
                client_secret: client_secret,
                grant_type: "password"
            },
            success: function (data) {
                //console.log(data);
                token = data.access_token;
                refresh_token = data.refresh_token;
                tokenExpiretime = new Date(Date.now() + data.expires_in * 1000);
                //console.log(tokenExpiretime);
            }
        });
        //console.log("Token received");
    }
    return token;
}

var lastUpdate = "";
var modelIsColored = false;
async function getRecentOdooData() {
    if (!modelIsColored)
        return;

    //Authenticate with MUK API
    var token = await getToken();

    //var debugInfo = "";
    //Get project name
    var projectNumber = await getProjectNumber();
    if (projectNumber == undefined)
        return;

    //Get project ID
    var id = await GetProjectId(projectNumber);

    if (lastUpdate === "") {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: '[["project_id.id", "=", "' + id + '"]]',
                order: 'write_date desc',
                limit: 1,
                fields: '["id", "write_date"]'
            },
            success: function (data) {
                if (data.length > 0) {
                    lastUpdate = data[0].write_date;
                    lastUpdate = addASecond(lastUpdate);
                    //console.log("Last update: " + lastUpdate);
                }
            }
        });
    }
    else {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: '[["project_id.id", "=", "' + id + '"],["write_date",">=","' + lastUpdate + '"]]',
                order: 'write_date desc',
                fields: '["id", "write_date", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "state", "mark_available"]',
            },
            success: async function (data) {
                var date = getStringFromDate(new Date());
                if (data.length > 0) {
                    console.log(date + ": " + data.length + " updated records found.");
                    lastUpdate = data[0].write_date;
                    lastUpdate = addASecond(lastUpdate);

                    var referenceDate = new Date();
                    referenceDate.setHours(23);
                    referenceDate.setMinutes(59);
                    referenceDate.setSeconds(59);
                    for (const record of data) {
                        var status = getStatus(record, referenceDate);
                        var color = getColorByStatus(status);

                        const mobjectsArr = await API.viewer.getObjects({ parameter: { properties: { 'Default.GUID': record.name } } });
                        //console.log("mobjectsArr length: " + mobjectsArr.length);

                        var compressedIfcGuids = [];
                        var compressedIfcGuid = Guid.fromFullToCompressed(record.name);
                        compressedIfcGuids.push(compressedIfcGuid);
                        //remove element from previous status
                        for (const objStatus of objectStatuses) {
                            var index = objStatus.CompressedIfcGuids.indexOf(compressedIfcGuid);
                            if (index != -1) {
                                objStatus.CompressedIfcGuids.splice(index, 1);
                                console.log("Assembly " + record.name + " removed from CompressedIfcGuids as " + objStatus.Status);
                            }
                            index = objStatus.Guids.indexOf(record.name);
                            if (index != -1) {
                                objStatus.Guids.splice(index, 1);
                                console.log("Assembly " + record.name + " removed from Guids as " + objStatus.Status);
                            }
                        }
                        //add element to new status
                        var objStatus = objectStatuses.find(o => o.Status === status);
                        objStatus.Guids.push(record.name);
                        objStatus.CompressedIfcGuids.push(compressedIfcGuid);
                        console.log("Assembly " + record.name + " added as " + status);

                        for (const mobjects of mobjectsArr) {
                            var modelId = mobjects.modelId;
                            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuids);
                            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: color });
                        }
                    }
                }
                else {
                    console.log(date + ": no updated records found.");
                }
            }
        });
    }
}

var projectId = -1;
async function GetProjectId(projectNumber) {
    if (projectId == -1) {
        var id = -1;
        //console.log("Start get project Id");
        //console.log("Odoo URL: " + odooURL + "/api/v1/search_read");
        //console.log("using token: " + token);

        //Authenticate with MUK API
        var token = await getToken();

        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "project.project",
                domain: '[["project_identifier", "=", "' + projectNumber + '"]]',
                fields: '["id", "project_identifier"]',
            },
            success: function (data) {
                //console.log(data);
                id = data[0].id;
                projectId = id;
            }
        });
        //console.log("End get project Id");
    }

    return projectId;
}

//#endregion

//#endregion

//#region controls

var filterTypeSelectBox = $('#filterTypeSelection').dxSelectBox({
    items: getFilterTypes(),
    onValueChanged: function (e) {
        var prefixSelectDiv = document.getElementById("prefixSelectionGrp");
        var assemblyInputDiv = document.getElementById("assemblyInputGrp");
        var manualInputDiv = document.getElementById("manualInputGrp");

        prefixSelectDiv.style.display = "none";
        assemblyInputDiv.style.display = "none";
        manualInputDiv.style.display = "none";

        var filterTypes = getFilterTypes();
        var selectedItem = e.component.option("selectedItem");
        if (selectedItem === filterTypes[0]) {
            prefixSelectDiv.style.display = "block";
        }
        else if (selectedItem === filterTypes[1]) {
            assemblyInputDiv.style.display = "block";
        }
        else if (selectedItem === filterTypes[2]) {
            manualInputDiv.style.display = "block";
        }
    },
});

var labelContentSelectBox = $('#labelContentSelection').dxSelectBox({
    items: getLabelContentTypes(),
    value: getLabelContentTypes()[0],
    onValueChanged: function (e) {

    },
});

var labelContentOdooSelectBox = $('#labelContentOdooSelection').dxSelectBox({
    items: getLabelContentOdooTypes(),
    value: getLabelContentOdooTypes()[0],
    onValueChanged: function (e) {

    },
});

var checkBoxToday = $('#checked').dxCheckBox({
    value: true,
    onValueChanged: function (e) {
        var dateDiv = document.getElementById("dateDiv");
        if (Boolean(e.value)) {
            dateDiv.style.display = "none";
        }
        else {
            dateDiv.style.display = "block";
        }
    },
});

const popup = $('#popup').dxPopup({
    contentTemplate: popupContentTemplate,
    width: 300,
    height: 560,
    container: '.dx-viewport',
    showTitle: true,
    title: 'Info',
    visible: false,
    dragEnabled: false,
    hideOnOutsideClick: true,
    showCloseButton: true,
    position: {
        at: 'center',
        my: 'center',
    },
    toolbarItems: [{
        widget: 'dxButton',
        toolbar: 'bottom',
        location: 'after',
        options: {
            text: 'Close',
            onClick() {
                popup.hide();
            },
        },
    }],
}).dxPopup('instance');

var referenceDatePicker = $('#date').dxDateBox({
    calendarOptions: { firstDayOfWeek: 1 },
    type: 'date',
    label: "dag/maand/jaar",
    displayFormat: 'dd/MM/yyyy',
    value: Date.now(),
});

//#region textboxes

const assemblyTextBox = $('#placeholderAssemblyname').dxTextBox({
    placeholder: getTextById("phAssemblyname"),
});

var odooPasswordTextbox = $('#placeholderOdooPassword').dxTextBox({
    mode: 'password',
    placeholder: getTextById("phOdooPassword"),
});

var odooSearchTextBox = $('#placeholderOdooSearch').dxTextBox({
    placeholder: getTextById("phOdooSearch"),
});

var odooUsernameTextbox = $('#placeholderOdooUsername').dxTextBox({
    placeholder: getTextById("phOdooUsername"),
});

const prefixSelectionTagBox = $('#prefixSelection').dxTagBox({
    items: prefixes,
    showSelectionControls: true,
    applyValueMode: 'useButtons',
    //onValueChanged: function () {
    //    DevExpress.ui.notify("The button was clicked");
    //},
});

const propertyNameTextBox = $('#placeholderPropertyName').dxTextBox({
    placeholder: getTextById("phPropertyname"),
});

const propertyValueTextBox = $('#placeholderPropertyValue').dxTextBox({
    placeholder: getTextById("phPropertyvalue"),
});

//#endregion

//#region buttons

$("#btnCreateSlipDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnCreateSlip"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        modelIsColored = false;
        data.component.option('text', getTextById("btnCreatingSlip"));
        buttonIndicator.option('visible', true);

        try {
            //Get project name
            var projectNumber = await getProjectNumber();
            if (projectNumber == undefined)
                return;

            //Authenticate with MUK API
            var token = await getToken();

            //Get project ID
            var id = await GetProjectId(projectNumber);

            if (prefixDetails.length == 0) {
                await fillPrefixDetails();
            }

            //console.log("projectId: " + id);
            //console.log(selectedObjects);
            var deliverySlipId = -1;
            await $.ajax({
                type: "POST",
                url: odooURL + "/api/v1/create",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "vpb.delivery.slip",
                    values: '{"project_id": ' + id + '}',
                },
                success: function (odooData) {
                    deliverySlipId = odooData[0];
                }
            });

            //console.log("deliverySlipId:");
            //console.log(deliverySlipId);
            if (deliverySlipId == undefined || deliverySlipId == -1)
                throw "Deliveryslip was not created";

            var objStatusPlannedForTransport = objectStatuses.find(x => x.Status === StatusPlannedForTransport);
            for (var selectedObject of selectedObjects) {
                if (selectedObject.OdooPmmId == -1 || selectedObject.OdooTcmId == -1 || !selectedObject.Valid)
                    continue;

                //console.log("selectedObject.OdooPmmId:");
                //console.log(selectedObject.OdooPmmId);
                //console.log("selectedObject.OdooTcmId:");
                //console.log(selectedObject.OdooTcmId);

                var prefixDetail = prefixDetails.find(x => x.Prefix === selectedObject.Prefix);
                var valuesStr = '{"slip_id": ' + deliverySlipId
                    + ', "mark_id": ' + selectedObject.OdooPmmId
                    + ', "trimble_connect_id": ' + selectedObject.OdooTcmId
                    + ', "name": "' + selectedObject.OdooCode + '"'
                    + ', "product_qty": 1';
                if (prefixDetail != undefined)
                    valuesStr = valuesStr + ', "product_id": ' + prefixDetail.ProductId;
                valuesStr = valuesStr + '}';
                //console.log(valuesStr);
                await $.ajax({
                    type: "POST",
                    url: odooURL + "/api/v1/create",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "vpb.delivery.slip.line",
                        values: valuesStr,
                    },
                    success: async function (odooData) {
                        var deliverySlipLineId = odooData[0];

                        //TODO: take reference date into account
                        var guidToChange = selectedObject.Guid;
                        const mobjectsArr = await API.viewer.getObjects({ parameter: { properties: { 'Default.GUID': guidToChange } } });

                        var compressedIfcGuids = [];
                        var compressedIfcGuid = Guid.fromFullToCompressed(guidToChange);
                        compressedIfcGuids.push(compressedIfcGuid);
                        //remove element from previous status
                        for (const objStatus of objectStatuses) {
                            var index = objStatus.CompressedIfcGuids.indexOf(compressedIfcGuid);
                            if (index != -1) {
                                objStatus.CompressedIfcGuids.splice(index, 1);
                                console.log("Assembly " + guidToChange + " removed from CompressedIfcGuids as " + objStatus.Status);
                            }
                            index = objStatus.Guids.indexOf(guidToChange);
                            if (index != -1) {
                                objStatus.Guids.splice(index, 1);
                                console.log("Assembly " + guidToChange + " removed from Guids as " + objStatus.Status);
                            }
                        }
                        //add element to new status
                        var objStatus = objStatusPlannedForTransport;
                        objStatus.Guids.push(guidToChange);
                        objStatus.CompressedIfcGuids.push(compressedIfcGuid);
                        console.log("Assembly " + guidToChange + " added as " + status);

                        for (const mobjects of mobjectsArr) {
                            var modelId = mobjects.modelId;
                            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuids);
                            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: objStatus.Color });
                        }

                        //console.log("deliverySlipLineId:");
                        //console.log(deliverySlipLineId);
                    }
                });
            }

            await refreshExistingSlips();

            await API.viewer.setSelection(undefined, 'remove');
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnCreateSlip"));
    },
});

$("#btnGetOdooInfoDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnGetOdooInfo"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnGetOdooInfo"));
        buttonIndicator.option('visible', true);
        try {
            await checkAssemblySelection();

            const selection = await API.viewer.getSelection();
            const selector = {
                modelObjectIds: selection
            };
            const mobjectsArr = await API.viewer.getObjects(selector);
            var selectedGuids = [];
            for (const mobjects of mobjectsArr) {
                const objectRuntimeIds = mobjects.objects.map(o => o.id); //o.id = runtimeId = number
                const objectIds = await API.viewer.convertToObjectIds(mobjects.modelId, objectRuntimeIds);//objectIds = compressed ifc ids
                //console.log(objectRuntimeIds);
                selectedGuids.push(...objectIds.map(x => Guid.fromCompressedToFull(x)));
            }

            if (selectedGuids.length == 0)
                throw "Nothing selected";

            //Get project name
            var projectNumber = await getProjectNumber();
            if (projectNumber == undefined)
                return;

            //Authenticate with MUK API
            var token = await getToken();

            //Get project ID
            var projectId = await GetProjectId(projectNumber);

            var selectedAssemblies = [];

            for (var i = 0; i < selectedGuids.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
                var domainTrimbleConnectMain = "";

                for (var j = i; j < selectedGuids.length && j < i + fetchLimit; j++) {
                    var filterArrStr = '["name", "ilike", "' + selectedGuids[j] + '"]';
                    if (j > i) {
                        domainTrimbleConnectMain = '"|", ' + filterArrStr + ',' + domainTrimbleConnectMain;
                    }
                    else {
                        domainTrimbleConnectMain = filterArrStr;
                    }
                }
                //adding project_id to the query reduces the time it takes to find the records
                //based on seeing how fast the grid refreshes with and w/o project_id, should properly time the difference to verify.
                //should also try this with other queries that use ilike
                domainTrimbleConnectMain = '[["project_id.id", "=", "' + projectId + '"],' + domainTrimbleConnectMain + "]";
                //console.log("domainTrimbleConnectMain");
                //console.log(domainTrimbleConnectMain);
                var domainProjectMarks = "";
                var recordsAdded = 0;
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "trimble.connect.main",
                        domain: domainTrimbleConnectMain,
                        fields: `["id", "name", "mark_id", "rank", "date_drawn", "date_fab_planned", "date_fab_start", "date_fab_end", "date_fab_dem", 
                            "date_transported", "date_transported", "mark_available", "location_bin", "freight", "unit_id"]`,
                    },
                    success: function (odooData) {
                        //console.log("trimble.connect.main");
                        //console.log(odooData);
                        var cntr = 0;
                        for (var record of odooData) {
                            var filterArrStr = '["id", "=", "' + record.mark_id[0] + '"]';
                            if (cntr > 0) {
                                domainProjectMarks = '"|", ' + filterArrStr + ',' + domainProjectMarks;
                            }
                            else {
                                domainProjectMarks = filterArrStr;
                            }
                            selectedAssemblies.push(
                                {
                                    OdooTcmId: record.id,
                                    Guid: record.name,
                                    OdooPmmId: record.mark_id[0],
                                    Rank: record.rank,
                                    OdooCode: record.mark_id[1],
                                    DateDrawn: record.date_drawn ? getDateShortString(getDateFromString(record.date_drawn)) : "",
                                    DateProductionPlanned: record.date_fab_planned ? getDateShortString(getDateFromString(record.date_fab_planned)) : "",
                                    DateProductionStarted: record.date_fab_start ? getDateShortString(getDateFromString(record.date_fab_start)) : "",
                                    DateProductionEnded: record.date_fab_end ? getDateShortString(getDateFromString(record.date_fab_end)) : "",
                                    DateDemoulded: record.date_fab_dem ? getDateShortString(getDateFromString(record.date_fab_dem)) : "",
                                    DateTransported: record.date_transported ? getDateShortString(getDateFromString(record.date_transported)) : "",
                                    AvailableForTransport: record.mark_available,
                                    Bin: record.location_bin[1],
                                    Freight: record.freight == -1 ? '/' : record.freight,
                                    Unit: record.unit_id[1],
                                    Mass: 0,
                                    PosNmbr: 0,
                                    Prefix: "",
                                    AssemblyName: "",
                                    Length: 0,
                                    Volume: 0,
                                    Profile: "",
                                    DrawingsUrls: [],
                                    CableLength: ""
                                });
                            cntr++;
                            recordsAdded++;
                        }
                        //don't think project_id would make this query faster since it's an exact id is given
                        domainProjectMarks = "[" + domainProjectMarks + "]";
                    }
                });
                if (recordsAdded > 0) {
                    //console.log("domainProjectMarks");
                    //console.log(domainProjectMarks);
                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "project.master_marks",
                            domain: domainProjectMarks,
                            fields: '["id", "mark_mass", "mark_ranking", "mark_prefix", "mark_length", "mark_volume", "mark_profile"]',
                        },
                        success: function (odooData) {
                            //console.log("project.master_marks");
                            //console.log(odooData);
                            for (var record of odooData) {
                                var objects = selectedAssemblies.filter(x => x.OdooPmmId == record.id);
                                for (var object of objects) {
                                    object.Mass = record.mark_mass;
                                    object.PosNmbr = record.mark_ranking;
                                    object.Prefix = record.mark_prefix;
                                    object.AssemblyName = record.mark_prefix + record.mark_ranking + "." + object.Rank;
                                    object.Length = record.mark_length;
                                    object.Volume = record.mark_volume;
                                    object.Profile = record.mark_profile;
                                }
                            }
                        }
                    });

                    var domainDrawingMarks = domainProjectMarks.replace("id", "mark_id.id");
                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "project.mark_drawings",
                            domain: domainDrawingMarks,
                            fields: '["mark_id", "name_system", "description"]',
                        },
                        success: function (odooData) {
                            for (var record of odooData) {
                                var objects = selectedAssemblies.filter(x => x.OdooPmmId == record.mark_id[0]);
                                for (var object of objects) {
                                    if (record.description === "B") {
                                        object.DrawingsUrls.push(getOdooDrawingUrl(projectNumber, record.name_system));
                                    }
                                }
                            }
                        }
                    });
                }
            }

            odooAssemblyData = selectedAssemblies[0];

            var models = await API.viewer.getModels("loaded");
            var compressedGuid = Guid.fromFullToCompressed(odooAssemblyData.Guid);
            for (var model of models) {
                var runtimeIds = await API.viewer.convertToObjectRuntimeIds(model.id, [compressedGuid]);
                if (runtimeIds != undefined && runtimeIds.length > 0 && runtimeIds[0] != undefined) {
                    const objPropertiesArr = await API.viewer.getObjectProperties(model.id, runtimeIds);
                    for (const objproperties of objPropertiesArr) {
                        var defaultProperties = objproperties.properties.find(p => p.name === "Default");
                        if (defaultProperties == undefined)
                            continue;
                        var cableLength = defaultProperties.properties.find(x => x.name === "CABLE_LENGTH");
                        if (cableLength == undefined)
                            continue;
                        odooAssemblyData.CableLength = cableLength.value;
                    }
                }
            }
            

            popup.option({
                contentTemplate: () => popupContentTemplate(),
            });
            popup.show();
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnGetOdooInfo"));
    },
});

$("#btnOdooSearchDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnOdooSearch"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnOdooSearch"));
        buttonIndicator.option('visible', true);
        try {
            //decode string
            var searchStr = odooSearchTextBox.dxTextBox("instance").option("value");
            if (searchStr.trim() === "") throw "Empty searchstring, no selection performed.";
            var splitBySpaceArr = searchStr.trim().split(" ");
            var queryGroups = [];
            for (var splitBySpace of splitBySpaceArr) {
                var letterGroups = splitBySpace.match(/[a-zA-Z]+/g);
                if (letterGroups == null) throw 'Prefix missing in part "' + splitBySpace + '", no selection performed.';
                if (letterGroups.length > 1) throw 'Unexpected text in "' + splitBySpace + '", no selection performed.';
                var prefix = letterGroups.length > 0 ? letterGroups[0] : '';
                var splitPartExclPrefix = splitBySpace.substring(prefix.length);
                if (splitPartExclPrefix === "*") {
                    queryGroups.push(getQueryGroupItemByPrefix(prefix));
                }
                else {
                    var splitByPlusArr = splitPartExclPrefix.split("+");
                    for (var splitByPlus of splitByPlusArr) {
                        var splitByMinusArr = splitByPlus.split("-");
                        if (splitByMinusArr.length > 1) {
                            if (splitByMinusArr.length % 2 == 0) {
                                for (var i = 0; i < splitByMinusArr.length; i += 2) {
                                    var start = getPosAndRank(splitByMinusArr[i], true);
                                    var end = getPosAndRank(splitByMinusArr[i + 1], false);
                                    queryGroups.push(getQueryGroupItem(prefix, start, end));
                                }
                            }
                        }
                        else {
                            var start = getPosAndRank(splitByMinusArr[0], true);
                            var end = getPosAndRank(splitByMinusArr[0], false);
                            queryGroups.push(getQueryGroupItem(prefix, start, end));
                        }
                    }
                }
            }

            //console.log(queryGroups);

            //search for assemblies on Odoo
            //Authenticate with MUK API
            var token = await getToken();

            //Get project name
            var projectNumber = await getProjectNumber();

            //Get project ID
            var projectId = await GetProjectId(projectNumber);

            if (prefixDetails.length == 0) {
                await fillPrefixDetails();
            }

            var domainStr = "";
            for (var i = 0; i < queryGroups.length; i++) {
                var q = queryGroups[i];
                var qStr = "";
                if (q.Prefix === "V") {
                    qStr = '"&",["freight", ">=", "' + q.StartPos + '"],["freight", "<=", "' + q.EndPos + '"]';
                }
                else {
                    var partPrefix = '["mark_id.mark_prefix", "=", "' + q.Prefix + '"]';
                    var partOrange = '["mark_id.mark_ranking", "=", "' + q.StartPos + '"]';
                    if (q.StartPos == q.EndPos && q.StartRank == 1 && q.EndRank == maxRank) {
                        qStr = '"&",' + partPrefix + ',' + partOrange;
                    }
                    else if (q.StartPos == q.EndPos && q.StartRank == q.EndRank) {
                        qStr = '"&",' + partPrefix + ',"&",' + partOrange + ',["rank", "=", "' + q.StartRank + '"]';
                    }
                    else {
                        //odooPos == startpos && odooRank >= startrank || odooPos == endpos && odooRank <= endrank || odooPos > startpos && odooPos < endpos
                        //orange || green || blue
                        var partOrange = '["mark_id.mark_ranking", "=", "' + q.StartPos + '"]';
                        if (q.StartRank != 1)
                            partOrange = '"&",' + partOrange + ',["rank", ">=", "' + q.StartRank + '"]';
                        var partGreen = '["mark_id.mark_ranking", "=", "' + q.EndPos + '"]';
                        if (q.EndRank != maxRank)
                            partGreen = '"&",' + partGreen + ',["rank", "<=", "' + q.EndRank + '"]';
                        var partBlue = '"&",["mark_id.mark_ranking", ">", "' + q.StartPos + '"],["mark_id.mark_ranking", "<", "' + q.EndPos + '"]';
                        qStr = '"&",' + partPrefix + ',"|",' + partOrange + ',"|",' + partGreen + ',' + partBlue;
                    }
                }
                if (i > 0) {
                    domainStr = '"|",' + qStr + "," + domainStr;
                }
                else {
                    domainStr = qStr;
                }
            }
            domainStr = '[["project_id.id", "=", "' + projectId + '"],' + domainStr + ']';

            //domainStr = '[';
            //domainStr += '["project_id.id", "=", "2238"],';

            //domainStr += '"|",';

            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_prefix", "=", "PV"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "1"],';
            //domainStr += '["rank", ">=", "1"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "20"],';
            //domainStr += '["rank", "<=", "99999"],';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", ">", "1"],';
            //domainStr += '["mark_id.mark_ranking", "<", "20"],';

            //domainStr += '"|",';

            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_prefix", "=", "BS"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "1"],';
            //domainStr += '["rank", ">=", "1"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "5"],';
            //domainStr += '["rank", "<=", "99999"],';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", ">", "1"],';
            //domainStr += '["mark_id.mark_ranking", "<", "5"],';

            //domainStr += '"|",';

            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_prefix", "=", "BV"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "1"],';
            //domainStr += '["rank", ">=", "1"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "5"],';
            //domainStr += '["rank", "<=", "99999"],';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", ">", "1"],';
            //domainStr += '["mark_id.mark_ranking", "<", "5"],';

            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_prefix", "=", "FM"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "1"],';
            //domainStr += '["rank", ">=", "1"],';
            //domainStr += '"|",';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", "=", "5"],';
            //domainStr += '["rank", "<=", "99999"],';
            //domainStr += '"&",';
            //domainStr += '["mark_id.mark_ranking", ">", "1"],';
            //domainStr += '["mark_id.mark_ranking", "<", "5"]';

            //domainStr += ']';

            console.log(domainStr);

            var assembliesToSelect = [];
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "trimble.connect.main",
                    domain: domainStr,
                    order: 'id',
                    fields: '["id", "mark_id", "rank", "name"]'
                },
                success: function (data) {
                    if (data.length > 0) {
                        for (var record of data) {
                            assembliesToSelect.push(
                                {
                                    OdooId: record.id,
                                    MarkId: record.mark_id[0],
                                    OdooName: record.mark_id[1],
                                    Rank: record.rank,
                                    Guid: record.name,
                                }
                            );
                        }
                    }
                }
            });
            console.log(assembliesToSelect);

            if (assembliesToSelect.length > 0) {
                var guidsToSelect = assembliesToSelect.map(a => a.Guid);
                //console.log(guidsToSelect);
                await selectGuids(guidsToSelect);
            }
            else {
                throw "No results found for given searchstring";
            }


            //select assemblies
            //inform if certain elements weren't found
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnOdooSearch"));
    },
});

$("#btnVisualizeTTDivId").dxButton({
    stylingMode: "outlined",
    text: "Visualiseer TT",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', 'Bezig met visualiseren');
        buttonIndicator.option('visible', true);


        buttonIndicator.option('visible', false);
        data.component.option('text', 'Visualiseer TT');
    },
});

$("#btnVisualizeWDivId").dxButton({
    stylingMode: "outlined",
    text: "Visualiseer W",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', 'Bezig met visualiseren');
        buttonIndicator.option('visible', true);


        buttonIndicator.option('visible', false);
        data.component.option('text', 'Visualiseer W');
    },
});

$("#btnRefreshExistingSlipsDivId").dxButton({
    stylingMode: "outlined",
    text: "Vernieuwen",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', 'Bezig met vernieuwen');
        buttonIndicator.option('visible', true);

        await refreshExistingSlips();

        buttonIndicator.option('visible', false);
        data.component.option('text', 'Vernieuwen');
    },
});

$("#btnSelectByFilterDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnSelectByFilter"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnSelectByFilterSelecting"));
        buttonIndicator.option('visible', true);
        try {
            //console.log("btnSelectByFilterDivId button clicked")
            await API.viewer.setSettings({ assemblySelection: true });
            await setSelectionByFilter();
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnSelectByFilter"));
    },
});

$("#btnSetColorFromStatusDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnSetColorFromStatus"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        modelIsColored = false;
        data.component.option('text', getTextById("btnSetColorFromStatusSetting"));
        buttonIndicator.option('visible', true);
        document.getElementById("legend").style.display = 'block';
        document.getElementById("trLegendExisting").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusExisting).Color);
        document.getElementById("trLegendModelled").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusModelled).Color);
        document.getElementById("trLegendOnHold").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusOnHold).Color);
        document.getElementById("trLegendDrawn").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusDrawn).Color);
        document.getElementById("trLegendPlanned").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusPlanned).Color);
        document.getElementById("trLegendDemoulded").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusDemoulded).Color);
        document.getElementById("trLegendProductionEnded").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusProductionEnded).Color);
        document.getElementById("trLegendAvailableForTransport").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusAvailableForTransport).Color);
        document.getElementById("trLegendPlannedForTransport").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusPlannedForTransport).Color);
        document.getElementById("trLegendTransported").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusTransported).Color);
        await setAccesBooleans();
        document.getElementById("transportDiv").style.display = hasAccesToTransport ? 'block' : 'none';
        document.getElementById("productionDiv").style.display = hasAccesToProduction ? 'block' : 'none';
        document.getElementById("freightsDiv").style.display = hasAccesToFreights ? 'block' : 'none';

        try {
            //var debugInfo = "";
            //Get project name
            var projectNumber = await getProjectNumber();
            if (projectNumber == undefined)
                return;

            //debugInfo = debugInfo.concat("<br />Project number: " + projectNumber);
            //console.log(debugInfo);

            //Authenticate with MUK API
            var token = await getToken();

            //Get project ID
            var id = await GetProjectId(projectNumber);

            clearObjectStatusesGuids();
            var referenceDate = new Date();
            var referenceToday = checkBoxToday.dxCheckBox("instance").option("value");
            //console.log("referenceToday: " + referenceToday);
            if (!Boolean(referenceToday)) {
                referenceDate = new Date(referenceDatePicker.dxDateBox("instance").option("value"));
                //console.log("referenceDate: " + referenceDate);
            }
            referenceDate.setHours(23);
            referenceDate.setMinutes(59);
            referenceDate.setSeconds(59);

            //Get concrete assembly info
            var guidsOnSlipsDraft = [];
            var ended = 0;
            var lastId = -1;
            if (hasAccesToTransport) {
                while (ended != 1) { //loop cuz only fetchLimit records get fetched at a time
                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "vpb.delivery.slip.line",
                            //domain: '[["trimble_connect_id.project_id.id", "=", "' + id + '"],["slip_id.state", "=", "draft"],["id", ">", "' + lastId + '"]]',
                            domain: '[["trimble_connect_id.project_id.id", "=", "' + id + '"],["slip_id.state", "=", "draft"],["id", ">", "' + lastId + '"]]',
                            fields: '["id", "trimble_connect_id"]',
                            order: 'id',
                        },
                        success: function (data) {
                            if (data.length == 0) { //no more records
                                ended = 1;
                                return;
                            }
                            for (const record of data) {
                                lastId = record.id;
                                guidsOnSlipsDraft.push(record.trimble_connect_id[1]);
                            }
                        }
                    });
                }
            }

            //console.log("Start: Getting concrete assembly info");
            var processedAssemblyIds = [];
            ended = 0;
            lastId = -1;
            while (ended != 1) { //loop cuz only fetchLimit records get fetched at a time
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "trimble.connect.main",
                        domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"],["state","!=","cancelled"]]',
                        fields: '["id", "mark_id", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "state", "mark_available"]',
                        order: 'id',
                    },
                    success: function (data) {
                        if (data.length == 0) { //no more records
                            ended = 1;
                            return;
                        }
                        for (const record of data) {
                            lastId = record.id;
                            var status = getStatus(record, referenceDate);
                            if (status === StatusAvailableForTransport && guidsOnSlipsDraft.indexOf(record.name) > -1) {
                                status = StatusPlannedForTransport;
                            }
                            var guidArr = objectStatuses.find(o => o.Status === status);
                            guidArr.Guids.push(record.name);
                            guidArr.CompressedIfcGuids.push(Guid.fromFullToCompressed(record.name));
                            if (record.mark_id[0] != undefined)
                                processedAssemblyIds.push(record.mark_id[0]);
                        }
                    }
                });
            }
            //console.log("Finished: Getting concrete assembly info");

            

            //--Get steel assembly info
            //Assume that assemblies, which are not entered into the trimble.connect.main table, are steel assemblies 
            //=> get all assemblies from project.master_marks
            //and filter out those that are entered into the trimble.connect.main table
            //result: unprocessedAssemblies
            //console.log("Start: Getting unprocessedAssemblies");
            var unprocessedAssemblies = []; //modelled steel assemblies
            ended = 0;
            lastId = -1;
            while (ended != 1) { //loop cuz only fetchLimit records get fetched at a time
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "project.master_marks",
                        domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"]]',
                        fields: '["id", "mark_prefix", "mark_ref", "create_date", "mark_qty"]',
                        order: 'id',
                    },
                    success: function (data) {
                        if (data.length == 0) { //no more records
                            ended = 1;
                            return;
                        }
                        for (const record of data) {
                            lastId = record.id;
                            if (!processedAssemblyIds.includes(record.id) && getDateFromString(record.create_date) <= referenceDate) {
                                for (var i = 0; i < record.mark_qty; i++) {
                                    var unprocessedAssembly = {
                                        Prefix: record.mark_prefix,
                                        AssemblyPos: record.mark_ref,
                                        Status: StatusDrawn,
                                        AssemblyId: record.id,
                                    }
                                    unprocessedAssemblies.push(unprocessedAssembly);
                                }
                            }
                        }
                    }
                });
            }
            //console.log("Finished: Getting unprocessedAssemblies");

            //console.log("Start: Getting project.mark_steel_production info");
            ended = 0;
            lastId = -1;
            while (ended != 1) { //loop cuz only fetchLimit records get fetched at a time
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "project.mark_steel_production",
                        domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"]]',
                        fields: '["id", "upper_id", "date_delivered"]',
                        order: 'id',
                    },
                    success: function (data) {
                        if (data.length == 0) { //no more records
                            ended = 1;
                            return;
                        }
                        for (const record of data) {
                            lastId = record.id;
                            var unprocessedUnplannedAssembly = unprocessedAssemblies.find(x => x.AssemblyId == record.upper_id[0] && x.Status === StatusDrawn);
                            if (unprocessedUnplannedAssembly != undefined) {
                                if (record.date_delivered != false && getDateFromString(record.date_delivered) <= referenceDate)
                                    unprocessedUnplannedAssembly.Status = StatusProductionEnded;
                                else
                                    unprocessedUnplannedAssembly.Status = StatusPlanned;
                            }
                        }
                    }
                });
            }
            //console.log("Finished: Getting project.mark_steel_production info");

            //console.log("Start: Getting project.mark_steel_pack info");
            var steelPacks = [];
            ended = 0;
            lastId = -1;
            while (ended != 1) { //loop cuz only fetchLimit records get fetched at a time
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "project.mark_steel_pack",
                        domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"]]',
                        fields: '["id", "mark_ids", "date_ready", "date_done"]', //mark_id = pack item id
                        order: 'id',
                    },
                    success: function (data) {
                        if (data.length == 0) { //no more records
                            ended = 1;
                            return;
                        }
                        for (const record of data) {
                            lastId = record.id;
                            if (record.mark_ids.length > 0) {
                                var dateReady = new Date(3000, 0, 1);
                                if (record.date_ready != false)
                                    dateReady = getDateFromString(record.date_ready);
                                var dateDone = new Date(3000, 0, 1);
                                if (record.date_done != false)
                                    dateDone = getDateFromString(record.date_done);
                                var steelPack = {
                                    OdooId: record.id,
                                    MarkIds: record.mark_ids,
                                    DateReady: dateReady,
                                    DateDone: dateDone,
                                };
                                steelPacks.push(steelPack);
                            }
                        }
                    }
                });
            }
            //console.log("Finished: Getting project.mark_steel_pack info");

            //get steel pack items
            //console.log("Start: Getting project.mark_steel_pack_items info");
            var steelPackItems = [];
            for (const steelPack of steelPacks) {
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "project.mark_steel_pack_items",
                        domain: '[["upper_id.id", "=", "' + steelPack.OdooId + '"]]',
                        fields: '["id", "mark_id", "qty"]', //mark_id = pack item id
                        order: 'id',
                    },
                    success: function (data) {
                        if (data.length == 0) { //no more records
                            ended = 1;
                            return;
                        }
                        for (const record of data) {
                            lastId = record.id;
                            if (record.qty > 0) {
                                var steelPackItem = {
                                    OdooId: record.id,
                                    AssemblyId: record.mark_id[0],
                                    Quantity: record.qty,
                                };
                                steelPackItems.push(steelPackItem);
                            }
                        }
                    }
                });
            }
            //console.log("Finished: Getting project.mark_steel_pack_items info");

            //console.log("Start: Processing steel pack info");
            for (const steelPack of steelPacks) {
                const itemsInPack = steelPackItems.filter(x => steelPack.MarkIds.includes(x.OdooId));
                for (const item of itemsInPack) {
                    //console.log(item);
                    for (var i = 0; i < item.Quantity; i++) {
                        var unprocessedAssembly = unprocessedAssemblies.find(x => x.AssemblyId == item.AssemblyId
                            && x.Status === StatusProductionEnded);
                        //console.log(unprocessedAssembly);
                        if (unprocessedAssembly != undefined) {
                            if (steelPack.DateReady <= referenceDate)
                                unprocessedAssembly.Status = StatusAvailableForTransport;
                            if (steelPack.DateDone <= referenceDate)
                                unprocessedAssembly.Status = StatusTransported;
                        }
                    }
                }
            }
            //console.log(unprocessedAssemblies);
            //console.log("Finished: Processing steel pack info");

            const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });

            //runtimeIds = [17062, 17065, ...] = ids used by viewer
            //objectIds = compressed IFC guids = ['28DCGNPlH98vcQNyNhB4sQ', '0fKOmd_6PFgOiexu4H1vtU', ...] = can be used to map runtimeId to original IFC

            //find objects by assemblypos and add to status objects
            var sliceLength = 5000;
            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                var tempObjectRuntimeIdsPerStatus = [];
                for (const objStatus of objectStatuses) {
                    var tempObjStatus = {
                        Status: objStatus.Status,
                        ObjectRuntimeIds: [],
                    };
                    tempObjectRuntimeIdsPerStatus.push(tempObjStatus);
                }

                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                for (var i = 0; i < objectsRuntimeIds.length; i += sliceLength) {
                    var objectsRuntimeIdsSliced = objectsRuntimeIds.slice(i, i + sliceLength);
                    const objectPropertiesArr = await API.viewer.getObjectProperties(modelId, objectsRuntimeIdsSliced);
                    for (const objproperties of objectPropertiesArr) {
                        var propMerknummer = objproperties.properties.flatMap(p => p.properties).find(p => p.name === "MERKNUMMER");
                        if (propMerknummer === undefined) continue;
                        var merkNummer = propMerknummer.value;
                        if (merkNummer.endsWith("(?)"))
                            merkNummer = merkNummer.substring(0, merkNummer.length - 3);
                        var unprocessedAssembly = unprocessedAssemblies.find(a => a.AssemblyPos === merkNummer);
                        if (unprocessedAssembly !== undefined) {
                            var tempArray = tempObjectRuntimeIdsPerStatus.find(x => x.Status === unprocessedAssembly.Status);
                            tempArray.ObjectRuntimeIds.push(objproperties.id)
                            var index = unprocessedAssemblies.indexOf(unprocessedAssembly);
                            unprocessedAssemblies.splice(index, 1);
                        }
                    }
                }

                for (const tempObjects of tempObjectRuntimeIdsPerStatus) {
                    if (tempObjects.ObjectRuntimeIds.length > 0) {
                        const tempObjectsIfcIds = await API.viewer.convertToObjectIds(modelId, tempObjects.ObjectRuntimeIds);
                        var objectStatus = objectStatuses.find(o => o.Status === tempObjects.Status);
                        objectStatus.Guids = objectStatus.Guids.concat(tempObjectsIfcIds.map(c => Guid.fromCompressedToFull(c)));
                        objectStatus.CompressedIfcGuids = objectStatus.CompressedIfcGuids.concat(tempObjectsIfcIds);
                    }
                }
            }

            var objectStatusModelled = objectStatuses.find(o => o.Status === StatusModelled);
            var unplannedIfcIds = [];
            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                const objectsIfcIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);

                var compressedIfcGuidsWithKnownStatus = [];
                for (const objStatus of objectStatuses) {
                    compressedIfcGuidsWithKnownStatus = compressedIfcGuidsWithKnownStatus.concat(objStatus.CompressedIfcGuids);
                }
                var compressedIfcGuidsWithKnownStatusSet = new Set(compressedIfcGuidsWithKnownStatus);

                unplannedIfcIds = unplannedIfcIds.concat(objectsIfcIds.filter(x => !compressedIfcGuidsWithKnownStatusSet.has(x)));

                for (const objStatus of objectStatuses) {
                    var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, objStatus.CompressedIfcGuids);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: objStatus.Color });
                }
            }

            //will also include existing assemblies
            objectStatusModelled.CompressedIfcGuids = Array.from(unplannedIfcIds);
            objectStatusModelled.Guids = objectStatusModelled.CompressedIfcGuids.map(c => Guid.fromCompressedToFull(c));

            const mobjectsExisting = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': 'BESTAAND' } } });
            for (const mobjects of mobjectsExisting) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                if (objectsRuntimeIds.length == 0)
                    continue;
                var objectStatusExisting = objectStatuses.find(o => o.Status === StatusExisting);
                objectStatusExisting.CompressedIfcGuids = objectStatusExisting.CompressedIfcGuids.concat(await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds));
                objectStatusExisting.Guids = objectStatusExisting.Guids.concat(objectStatusExisting.CompressedIfcGuids.map(i => Guid.fromCompressedToFull(i)));

                //remove existing from modelled
                var compressedIfcGuidsWithStatusExistingSet = new Set(objectStatusExisting.CompressedIfcGuids);
                objectStatusModelled.CompressedIfcGuids = Array.from(objectStatusModelled.CompressedIfcGuids.filter(x => !compressedIfcGuidsWithStatusExistingSet.has(x)));
                var guidsWithStatusExistingSet = new Set(objectStatusExisting.Guids);
                objectStatusModelled.Guids = Array.from(objectStatusModelled.Guids.filter(x => !guidsWithStatusExistingSet.has(x)));

                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: objectStatusExisting.Color });
            }

            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                //get overlapping runtimeIds of both collections
                var runtimeIdsModelled = await API.viewer.convertToObjectRuntimeIds(modelId, objectStatusModelled.CompressedIfcGuids);
                const filteredRuntimeIds = objectsRuntimeIds.filter(i => runtimeIdsModelled.includes(i));

                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: filteredRuntimeIds }] }, { color: objectStatusModelled.Color });
            }

            modelIsColored = true;
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnSetColorFromStatus"));
    },
});

$("#btnSetOdooLabelsDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnSetOdooLabels"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnSetOdooLabelsSetting"));
        buttonIndicator.option('visible', true);
        try {
            await checkAssemblySelection();

            var username = odooUsernameTextbox.dxTextBox("instance").option("value");
            var password = odooPasswordTextbox.dxTextBox("instance").option("value");
            if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
                console.log("no username and/or password found");
                throw getTextById("errorMsgUsernamePassword");
            }

            var selectedItem = labelContentOdooSelectBox.dxSelectBox("instance").option("selectedItem"); 
            var possibleSelectBoxValues = getLabelContentOdooTypes();

            let jsonArray = "[";
            const selection = await API.viewer.getSelection();
            const selector = {
                modelObjectIds: selection
            };
            const modelspecs = await API.viewer.getModels();
            const mobjectsArr = await API.viewer.getObjects(selector);
            var nmbrOfAssembliesFound = 0;
            for (const mobjects of mobjectsArr) {
                //console.log(modelspecs);
                const modelspec = modelspecs.find(s => s.id === mobjects.modelId);
                //console.log(modelspec);
                const modelPos = modelspec.placement.position;
                //console.log(modelPos);
                const objectRuntimeIds = mobjects.objects.map(o => o.id); //o.id = runtimeId = number
                const objectIds = await API.viewer.convertToObjectIds(mobjects.modelId, objectRuntimeIds);//objectIds = compressed ifc ids
                const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectRuntimeIds);
                //console.log(objectRuntimeIds);
                var assemblyNames = await getAssemblyNamesByCompressedGuids(objectIds);
                //console.log(assemblyNames);
                for (const objproperties of objPropertiesArr) {
                    var defaultProperties = objproperties.properties.find(p => p.name === "Default");
                    if (defaultProperties == undefined)
                        continue;
                    var cogX = defaultProperties.properties.find(x => x.name === "COG_X");
                    var cogY = defaultProperties.properties.find(x => x.name === "COG_Y");
                    var cogZ = defaultProperties.properties.find(x => x.name === "COG_Z");
                    var guid = defaultProperties.properties.find(x => x.name === "GUID");
                    if (cogX == undefined || cogX == undefined || cogX == undefined || guid == undefined)
                        continue;
                    
                    var color = { r: 60, g: 203, b: 62, a: 255 };
                    var coordinates = { x: modelPos.x + cogX.value, y: modelPos.y + cogY.value, z: modelPos.z + cogZ.value };
                    var labelText = "";
                    if (selectedItem === possibleSelectBoxValues[0]) {
                        var assemblyNameObj = assemblyNames.find(x => x.Guid.toUpperCase() === guid.value.toUpperCase());
                        if (assemblyNameObj != undefined) {
                            if (assemblyNameObj.AssemblyQuantity > 1)
                                color = { r: 255, g: 0, b: 0, a: 255 };
                            labelText = assemblyNameObj.AssemblyName;
                        }
                        else
                            continue;
                    }

                    if (labelText != "") {
                        jsonArray += getMarkupJson(color, coordinates, mobjects.modelId, objproperties.id, labelText) + ",";
                        nmbrOfAssembliesFound++;
                    }
                }
            }

            jsonArray = jsonArray.slice(0, -1);
            jsonArray += "]";
            await API.markup.removeMarkups();
            if (nmbrOfAssembliesFound > 0) {
                await API.markup.addTextMarkup(JSON.parse(jsonArray));
            }
            else {
                DevExpress.ui.notify(getTextById("errorMsgNoOdooAssembliesFound"));
            }
        }
        catch (e) {
            DevExpress.ui.notify(e);
            console.log(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnSetOdooLabels"));
    },
});

$("#btnShowAllColoredDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnShowAllColored"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        modelIsColored = false;
        data.component.option('text', getTextById("btnShowAllColored"));
        buttonIndicator.option('visible', true);
        try {
            const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });

            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                const modelCompressedIfcGuids = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);
                const modelCompressedIfcGuidsSet = new Set(modelCompressedIfcGuids);

                for (const objStatus of objectStatuses) {
                    var statusCompressedIfcGuidsInModel = Array.from(objStatus.CompressedIfcGuids.filter(x => modelCompressedIfcGuidsSet.has(x)));
                    var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, statusCompressedIfcGuidsInModel);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { visible: true });
                }
            }

            modelIsColored = true;
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnShowAllColored"));
    },
});

$("#btnShowArrowsDivId").dxButton({
    stylingMode: "outlined",
    text: "Toon montagepijlen",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        try {
            //Show Arrows
            const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Default.COMMENT", "MONTAGEPIJL"));
            console.log(mobjectsArrPijlen);
            if (mobjectsArrPijlen.length != undefined && mobjectsArrPijlen.length > 0) {
                for (var mobjects of mobjectsArrPijlen) {
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: true });
                }
            }
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
    }
});

$("#btnShowKnownPrefixesDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnShowKnownPrefixes"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnShowKnownPrefixesFiltering"));
        buttonIndicator.option('visible', true);
        try {
            const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
            var sliceLength = 5000;
            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });
                if (idsPerPrefixPerModelId.find(o => o.ModelId === modelId) !== undefined) {
                    continue;
                }
                var idsPerPrefix = [];
                for (var i = 0; i < objectsRuntimeIds.length; i += sliceLength) {
                    //var cntr = 0;
                    var objectsRuntimeIdsSliced = objectsRuntimeIds.slice(i, i + sliceLength);
                    const objectPropertiesArr = await API.viewer.getObjectProperties(modelId, objectsRuntimeIdsSliced);
                    //console.log("objectPropertiesArr: " + objectPropertiesArr);
                    //console.log("objectPropertiesArr.length: " + objectPropertiesArr.length);
                    for (const objproperties of objectPropertiesArr) {
                        //objproperties type: ObjectProperties, heeft id van object en array met propertysets
                        //objproperties.properties : PropertySet[]
                        //PropertySet.set is not included in the query
                        //console.log("objproperties.properties.length: " + objproperties.properties.length);
                        //var psetDefault = objproperties.properties.find(s => s.name === "Default");
                        //if (psetDefault === undefined) continue;
                        //console.log("psetDefault: " + psetDefault.name);
                        //var propPrefix = psetDefault.properties.find(p => p.name === "MERKPREFIX");
                        var propPrefix = objproperties.properties.flatMap(p => p.properties).find(p => p.name === "MERKPREFIX");
                        if (propPrefix === undefined) continue;
                        //console.log("propPrefix: " + propPrefix.name + " " + propPrefix.value);
                        if (!prefixes.includes(propPrefix.value)) continue;
                        var prefixArr = idsPerPrefix.find(p => p.Prefix === propPrefix.value);
                        if (prefixArr !== undefined) {
                            prefixArr.ObjectRuntimeIds.push(objproperties.id);
                            //cntr++;
                        }
                        else {
                            idsPerPrefix.push(
                                {
                                    Prefix: propPrefix.value,
                                    ObjectRuntimeIds: [objproperties.id]
                                }
                            );
                            //cntr++;
                        }
                    }
                    //console.log("i: " + i + " - cntr: " + cntr);
                }
                //console.log("new ids pushed for model " + modelId + " (#: " + idsPerPrefix.length + " )");
                idsPerPrefixPerModelId.push({ ModelId: modelId, IdsPerPrefix: idsPerPrefix });
            }

            //set all objects invisible
            //for (const mobjects of mobjectsArr) {
            //    var modelId = mobjects.modelId;
            //    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
            //    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });
            //}

            //show only known prefixes
            for (const modelIdDict of idsPerPrefixPerModelId) {
                var modelId = modelIdDict.ModelId;
                //console.log("Showing objects of model " + modelId);
                var runtimeIdsToShow = [];
                for (const idsPerPrefix of modelIdDict.IdsPerPrefix) {
                    runtimeIdsToShow = runtimeIdsToShow.concat(idsPerPrefix.ObjectRuntimeIds);
                }
                //console.log("runtimeIdsToShow.length " + runtimeIdsToShow.length);
                if (runtimeIdsToShow.length > 0) {
                    //console.log("change to visible");
                    //console.log("runtimeIdsToShow[0]" + runtimeIdsToShow[0]);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsToShow }] }, { visible: true });
                }
            }

            //Show Arrows
            const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Default.COMMENT", "MONTAGEPIJL"));
            console.log(mobjectsArrPijlen);
            if (mobjectsArrPijlen.length != undefined && mobjectsArrPijlen.length > 0) {
                for (var mobjects of mobjectsArrPijlen) {
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: true });
                }
            }
        }
        catch (e) {
            console.log(e);
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnShowKnownPrefixes"));
    },
});

$("#btnShowLabelsDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnShowLabels"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnShowLabelsShowing"));
        buttonIndicator.option('visible', true);
        try {
            await checkAssemblySelection();
            await addTextMarkups();
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnShowLabels"));
    },
});

$("#btnShowTitlesDivId").dxButton({
    stylingMode: "text",
    text: getTextById("btnHideTitles"),
    onClick: function (data) {
        var displayValue = titlesShown ? 'none' : 'block';
        document.getElementById("divTitleVisibility").style.display = displayValue;
        document.getElementById("divTitleFilters").style.display = displayValue;
        document.getElementById("divTitleExtra").style.display = displayValue;
        document.getElementById("divTitlePropertyLabels").style.display = displayValue;
        document.getElementById("divTitleTransport").style.display = displayValue;
        document.getElementById("divTitleVisualizeOdooData").style.display = displayValue;
        document.getElementById("divTitleAction1").style.display = displayValue;
        document.getElementById("divTitleAction2").style.display = displayValue;
        document.getElementById("divTitleAction3").style.display = displayValue;
        document.getElementById("divTitleAction4").style.display = displayValue;
        document.getElementById("divTitleAction5").style.display = displayValue;
        titlesShown = !titlesShown;
        data.component.option('text', titlesShown ? getTextById("btnHideTitles") : getTextById("btnShowTitles"));
    },
});

$("#btnVisualizeFreightsDivId").dxButton({
    stylingMode: "outlined",
    text: "Toon vrachten",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', 'Bezig met vrachten te visualiseren');
        buttonIndicator.option('visible', true);

        await visualizeFreights();

        buttonIndicator.option('visible', false);
        data.component.option('text', 'Toon vrachten');
    },
});

$("#showGridAndArrows").dxButton({
    stylingMode: "outlined",
    text: "Toon stramien en montagepijlen",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', 'Bezig met stramien en montagepijlen te zoeken');
        buttonIndicator.option('visible', true);
        try {
            console.log("start");

            //Show Grids
            const mobjectsArrGrids = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Presentation Layers.Layer", "Grid 0.0"));
            console.log("mobjectsArrGrids.length: " + mobjectsArrGrids.length);
            console.log("mobjectsArrGrids[0].objects.length: " + mobjectsArrGrids[0].objects.length);
            if (mobjectsArrGrids.length > 0) {
                await API.viewer.setObjectState(mobjectsArrGrids, true);
            }

            //Show Arrows
            const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Tekla Common.Finish", "MONTAGE"));
            console.log("mobjectsArrPijlen.length: " + mobjectsArrPijlen.length);
            console.log("mobjectsArrPijlen[0].objects.length: " + mobjectsArrPijlen[0].objects.length);
            if (mobjectsArrGrids.length > 0) {
                await API.viewer.setObjectState(mobjectsArrPijlen, true);
            }

            //await API.viewer.setSelection(mobjectsArrGrids, "add");
            //await API.viewer.setSelection(mobjectsArrPijlen, "add");

            console.log("end");
        }
        catch (e) {
            DevExpress.ui.notify(e);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', "Toon stramien en montagepijlen");
    },
});

var dropDownExistingSlips = $('#dropDownBoxExistingSlipsTransport').dxDropDownBox({
    value: 10,
    valueExpr: 'OdooId',
    deferRendering: false,
    placeholder: 'Select a value...',
    displayExpr(item) {
        return item && `${item.Name} <${item.State}>`;
    },
    showClearButton: true,
    dataSource: new DevExpress.data.DataSource({
        store: {
            type: "array",
            key: "OdooId",
            data: existingSlips,
            // Other ArrayStore properties go here
        },
        // Other DataSource properties go here
    }),
    contentTemplate(e) {
        const value = e.component.option('value');
        const $dataGrid = $('<div>').dxDataGrid({
            dataSource: e.component.getDataSource(),
            columns: ['Name', 'Date', 'State'],
            hoverStateEnabled: true,
            paging: { enabled: true, pageSize: 10 },
            filterRow: { visible: true },
            scrolling: { mode: 'virtual' },
            selection: { mode: 'single' },
            selectedRowKeys: [value],
            height: '100%',
            onSelectionChanged(selectedItems) {
                const keys = selectedItems.selectedRowKeys;
                const hasSelection = keys.length;

                e.component.option('value', hasSelection ? keys[0] : null);
            },
        });

        dataGrid = $dataGrid.dxDataGrid('instance');

        e.component.on('valueChanged', (args) => {
            dataGrid.selectRows(args.value, false);

            e.component.close();
        });

        e.component.on('valueChanged', async (args) => {
            var selectedSlip = existingSlips.find(x => x.OdooId == args.value);
            if (selectedSlip != undefined) {
                resetSlipDropdown = false;
                await selectGuids(selectedSlip.Guids);
            }
        });

        return $dataGrid;
    },
});

//#region legend

//Existing

$("#btnShowExisting").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusExisting, true);
    },
});

$("#btnHideExisting").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusExisting, false);
    },
});

$("#btnOnlyShowExisting").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusExisting);
    },
});

//Modelled
$("#btnShowModelled").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusModelled, true);
    },
});

$("#btnHideModelled").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusModelled, false);
    },
});

$("#btnOnlyShowModelled").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusModelled);
    },
});

//OnHold
$("#btnShowOnHold").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusOnHold, true);
    },
});

$("#btnHideOnHold").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusOnHold, false);
    },
});

$("#btnOnlyShowOnHold").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusOnHold);
    },
});

//Drawn
$("#btnShowDrawn").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusDrawn, true);
    },
});

$("#btnHideDrawn").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusDrawn, false);
    },
});

$("#btnOnlyShowDrawn").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusDrawn);
    },
});

//Planned
$("#btnShowPlanned").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusPlanned, true);
    },
});

$("#btnHidePlanned").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusPlanned, false);
    },
});

$("#btnOnlyShowPlanned").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusPlanned);
    },
});

//Demoulded
$("#btnShowDemoulded").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusDemoulded, true);
    },
});

$("#btnHideDemoulded").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusDemoulded, false);
    },
});

$("#btnOnlyShowDemoulded").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusDemoulded);
    },
});

//ProductionEnded
$("#btnShowProductionEnded").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusProductionEnded, true);
    },
});

$("#btnHideProductionEnded").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusProductionEnded, false);
    },
});

$("#btnOnlyShowProductionEnded").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusProductionEnded);
    },
});

//AvailableForTransport
$("#btnShowAvailableForTransport").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusAvailableForTransport, true);
    },
});

$("#btnHideAvailableForTransport").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusAvailableForTransport, false);
    },
});

$("#btnOnlyShowAvailableForTransport").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusAvailableForTransport);
    },
});

//PlannedForTransport
$("#btnShowPlannedForTransport").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusPlannedForTransport, true);
    },
});

$("#btnHidePlannedForTransport").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusPlannedForTransport, false);
    },
});

$("#btnOnlyShowPlannedForTransport").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusPlannedForTransport);
    },
});

//Transported
$("#btnShowTransported").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusTransported, true);
    },
});

$("#btnHideTransported").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusTransported, false);
    },
});

$("#btnOnlyShowTransported").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusTransported);
    },
});
//#endregion

//#endregion

var dataGridTransport = $("#dataGridTransport").dxDataGrid({
    dataSource: selectedObjects,
    keyExpr: 'OdooTcmId',
    showBorders: true,
    selection: {
        mode: 'single',
    },
    editing: {
        mode: 'row',
        allowDeleting: true,
        confirmDelete: false,
        useIcons: true,
    },
    columns: [{
        dataField: 'AssemblyName',
        caption: getTextById("gridTitleAssembly"),
        width: 130,
        sortOrder: 'asc',
        calculateSortValue: function (rowData) {
            return rowData.Prefix.toString().padStart(12, "0") + rowData.PosNmbr.toString().padStart(6, "0") + "." + rowData.Rank.toString().padStart(4, "0");
        },
    }, {
        dataField: 'Weight',
        caption: getTextById("gridTitleWeight"),
        dataType: 'number',
        width: 160,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'Profile',
        caption: 'Profiel',
        dataType: 'number',
        width: 160,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'SlipName',
        caption: 'Bon',
        width: 60,
        cellTemplate(container, options) {
            $(`<a>${options.value}</a>`)
                .append($('<a>', { href: getOdooSlipUrl(options.data.OdooSlipId), target: "_blank", rel: "noopener noreferrer" }))
                .appendTo(container);
        },
    },
    ],
    summary: {
        totalItems: [{
            column: 'AssemblyName',
            summartyType: 'count',
            displayFormat: getTextById("gridTitleTotalPieces") + " {0} " + getTextById("gridUnitNumber"),
        },{
            column: 'Weight',
            summaryType: 'sum',
            valueFormat: {
                type: "fixedPoint",
                precision: 0
            },
                displayFormat: getTextById("gridTitleTotalWeight") + " {0} kg",
        }],
    },
    onRowRemoving: async function (e) {
        var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
        instanceDropDown.reset();
        var objectRemoved = selectedObjects.find(x => x.OdooTcmId == e.key);
        if (objectRemoved != undefined) {
            var models = await API.viewer.getModels("loaded");
            for (var model of models) {
                var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: [objectRemoved.ObjectRuntimeId] }] };
                await API.viewer.setSelection(selector, 'remove');
            }
            e.cancel = true;
        }
    },
    onCellPrepared: function (e) {
        if (e.rowType === "data" /*&& e.column.dataField === "ProductName"*/) {
            e.cellElement.css("color", e.data.Valid ? "white" : "red");
        }
    },
});

var dataGridProduction = $("#dataGridProduction").dxDataGrid({
    dataSource: selectedObjects,
    keyExpr: 'OdooTcmId',
    showBorders: true,
    selection: {
        mode: 'single',
    },
    editing: {
        mode: 'row',
        allowDeleting: true,
        confirmDelete: false,
        useIcons: true,
    },
    columns: [{
        dataField: 'AssemblyName',
        caption: getTextById("gridTitleAssembly"),
        width: 130,
        sortOrder: 'asc',
        calculateSortValue: function (rowData) {
            return rowData.Prefix.toString().padStart(12, "0") + rowData.PosNmbr.toString().padStart(6, "0") + "." + rowData.Rank.toString().padStart(4, "0");
        },
    }, {
        dataField: 'Weight',
        caption: getTextById("gridTitleWeight"),
        dataType: 'number',
        width: 160,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'ReinforcementType',
        caption: 'Wapeningstype',
        dataType: 'number',
        width: 160,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'Profile',
        caption: 'Profiel',
        dataType: 'number',
        width: 160,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    },
    ],
    summary: {
        totalItems: [{
            column: 'AssemblyName',
            summartyType: 'count',
            displayFormat: getTextById("gridTitleTotalPieces") + " {0} " + getTextById("gridUnitNumber"),
        }, {
            column: 'Weight',
            summaryType: 'sum',
            valueFormat: {
                type: "fixedPoint",
                precision: 0
            },
            displayFormat: getTextById("gridTitleTotalWeight") + " {0} kg",
        }],
    },
    onRowRemoving: async function (e) {
        var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
        instanceDropDown.reset();
        var objectRemoved = selectedObjects.find(x => x.OdooTcmId == e.key);
        if (objectRemoved != undefined) {
            var models = await API.viewer.getModels("loaded");
            for (var model of models) {
                var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: [objectRemoved.ObjectRuntimeId] }] };
                await API.viewer.setSelection(selector, 'remove');
            }
            e.cancel = true;
        }
    },
    onCellPrepared: function (e) {
        if (e.rowType === "data" /*&& e.column.dataField === "ProductName"*/) {
            e.cellElement.css("color", e.data.Valid ? "white" : "red");
        }
    },
});

//#endregion

// https://github.com/jsdbroughton/ifc-guid/blob/master/Guid.js
// IfcGuid
// ----------------------------------------------------------------------------
// This class is a service class providing methods to generation and conversion
// between compressed and uncompressed string representations of GUIDs
// according to the algorithms used by the Industry Foundation Classes (IFC).
// The algorithm is based on an implementation in c as follows: 
// originally proposed by Jim Forester.
// implemented previously by Jeremy Tammik using hex-encoding
// Peter Muigg, June 1998
// Janos Maros, July 2000
//
// Provided "as-is", no warranty, no support is given to the users of this code
// ----------------------------------------------------------------------------
// Jonathon Broughton, September 2017
//
// Edited to fix a problem with leading 0's
var Guid = (function (ns) {

    const base64Chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_', '$'];

    const toUInt32 = (bytes, index) =>
        (parseInt(bytes
            .slice(index, index + 4)
            .reduce((str, v) => str + v, ""), 16)) >>> 0;

    const toUInt16 = (bytes, index) =>
        (parseInt(bytes
            .slice(index, index + 2)
            .reduce((str, v) => str + v, ""), 16)) >>> 0;

    const hex = (input) => input.toString(16);

    const pad = (char, input, length, join) => {
        if (Array.isArray(input)) {
            input = input.map((i) => pad(char, i, length));
            return join ? input.join('') : join;
        } else {
            return input.padStart(length, char); //edited
        }
    };

    const cv_to_64 = (number, result, start, len) => {
        let num = number,
            n = len,
            i;

        for (i = 0; i < n; i += 1) {
            result[start + len - i - 1] = base64Chars[parseInt(num % 64, 10)];
            num = num / 64;
        }
        return result;
    };

    const cv_from_64 = (str, start, len) => {
        let i, j, index,
            res = 0;

        for (i = 0; i < len; i += 1) {
            index = -1;
            for (j = 0; j < 64; j += 1) {
                if (base64Chars[j] === str[start + i]) {
                    index = j;
                    break;
                }
            }
            res = res * 64 + (index >>> 0);
        }
        return res;
    };

    ns.fromFullToCompressed = function (guid) {

        const num = [];
        let str = [],
            i,
            n = 2,
            pos = 0;

        const headBytes = ((guid) => {
            const bytes = [];
            guid.split('-').map((number, index) => {
                const bytesInChar = number.match(/.{1,2}/g);
                bytesInChar.map((byte) => bytes.push(byte));
            });
            return bytes;
        })(guid);

        const tailBytes = ((guid) => {
            const bytes = [];
            guid.split('-').map((number, index) => {
                const bytesInChar = number.match(/.{1,2}/g);
                bytesInChar.map((byte) => bytes.push(parseInt(byte, 16)));
            });
            return bytes;
        })(guid);

        num[0] = (toUInt32(headBytes, 0) / 16777216) >>> 0;
        num[1] = (toUInt32(headBytes, 0) % 16777216) >>> 0;
        num[2] = (toUInt16(headBytes, 4) * 256 + toUInt16(headBytes, 6) / 256) >>> 0;
        num[3] = ((toUInt16(headBytes, 6) % 256) * 65536 + tailBytes[8] * 256 + tailBytes[9]) >>> 0;
        num[4] = (tailBytes[10] * 65536 + tailBytes[11] * 256 + tailBytes[12]) >>> 0;
        num[5] = (tailBytes[13] * 65536 + tailBytes[14] * 256 + tailBytes[15]) >>> 0;

        for (i = 0; i < 6; i++) {
            str = cv_to_64(num[i], str, pos, n);
            pos += n;
            n = 4;
        }

        return str.join('');
    };

    ns.fromCompressedToFull = function (compressed) {
        const str = compressed.split(''),
            num = [];
        let n = 2,
            pos = 0,
            i;

        for (i = 0; i < 6; i += 1) {
            num[i] = cv_from_64(str, pos, n);
            pos += n;
            n = 4;
        }

        const a = hex(num[0] * 16777216 + num[1] >>> 0);
        const b = hex((num[2] / 256) >>> 0);
        const c = hex(((num[2] % 256) * 256 + num[3] / 65536) >>> 0);
        const d = [];

        d[0] = hex(((num[3] / 256) % 256) >>> 0);
        d[1] = hex(((num[3]) % 256) >>> 0);
        d[2] = hex((num[4] / 65536) >>> 0);
        d[3] = hex((num[4] / 256) % 256 >>> 0);
        d[4] = hex((num[4]) % 256 >>> 0);
        d[5] = hex((num[5] / 65536) >>> 0);
        d[6] = hex((num[5] / 256) % 256 >>> 0);
        d[7] = hex((num[5]) % 256 >>> 0);

        return [
            pad("0", a.toString(16), 8),
            pad("0", b.toString(16), 4),
            pad("0", c.toString(16), 4),
            pad("0", d.slice(0, 2), 2, true),
            pad("0", d.slice(2), 2, true)
        ]
            .join('-');
    };

    return ns;
}(Guid || {}));