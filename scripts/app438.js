var API = null;
var odooURL = "https://odoo.valcke-prefab.be"; //no slash at the end
var odooDatabase = "erp_prd"
var fetchLimit = 60; 
//80 was too much for a query with GUID's listed in the domain
//(threw a CORS error(= invalid query usually), response was complete though,
//should be looked into but since lowering fetchLimit doesn't give a noticable delay it was just set to 60 instead of 80 for now)

window.onload = async function () {
    API = await TrimbleConnectWorkspace.connect(window.parent, async (event, data) => {
        //console.log("Event: ", event, data);

        var eventName = event.split(".").pop();

        if (eventName === "onSelectionChanged") {
            await selectionChanged(data.data);
        }
    }, 3e4);

    fillObjectStatuses();
    await getRecentOdooDataTimed();
    //setInterval(getRecentOdooData, 5000);
    setTextByLanguage();
}

async function getRecentOdooDataTimed() {
    await getRecentOdooData();
    setTimeout(function () { getRecentOdooDataTimed(); }, 5000);
}

$("#testbtn").dxButton({
    stylingMode: "outlined",
    text: "test",
    type: "success",
    onClick: async function (data) {
        //try {
        //    var token = await getToken();
        //    var domain = '[["project_id.id", "=", "2238"],"|", ["name", "ilike", "dc46b795-7099-4f43-b1ff-75e4bf308bcb"],"|", ["name", "ilike", "d6419331-c75f-4a82-b8d9-77810938a7f1"],"|", ["name", "ilike", "6780d3e4-69b0-4635-8f4d-f780ac04cc20"],["name", "ilike", "610e1f82-7ba5-407c-b2d7-82549751e617"]]';
        //    await $.ajax({
        //        type: "GET",
        //        url: odooURL + "/api/v1/search_read",
        //        headers: { "Authorization": "Bearer " + token },
        //        data: {
        //            model: "trimble.connect.main",
        //            domain: domain,
        //            fields: '["id"]',
        //        },
        //        success: function (odooData) {
        //            console.log(odooData);
        //        }
        //    });
        //}
        //catch (e) {
        //    console.log(e);
        //}
        //console.log(getConcretecolorFromOdooStr('110;110;110'));

        //var id = await GetProjectId("V8695");

        //var token = await getToken();

        //var project;
        //await $.ajax({
        //    type: "GET",
        //    url: odooURL + "/api/v1/search_read",
        //    headers: { "Authorization": "Bearer " + token },
        //    data: {
        //        model: "project.project",
        //        domain: '[["id", "=", "' + id + '"]]',
        //        fields: '["id", "partner_id", "site_address_id"]',
        //    },
        //    success: function (data) {
        //        console.log('succes: ');
        //        console.log(data);
        //        project = { id: data[0].id, partner_id: data[0].partner_id[0], site_address_id: data[0].site_address_id[0] };
        //    }
        //});

        //console.log('project: ');
        //console.log(project);
    },
});

//#region global variables

var hasAccesToTransport = false;
var hasAccesToTransportUi = false;
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
const StatusErected = "Erected";

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
    nl: ["Merk", "BS_LengteKabel"], //, "BS_LR"
    fr: ["Assemblage", "BS_LongueurCable"], //, "BS_GD"
    en: ["Assembly", "BS_CableLength"] //, "BS_LR"
};

const labelContentTypesOdoo = {
    nl: ["Merk.Serienummer", "Vracht.PositieInVracht"],
    fr: ["Assemblage.NuméroDeSérie", "Charge.PlaceDansCharge"],
    en: ["Assembly.Serialnumber", "Freight.PositionInFreight"]
};

var freightColors = [
    { r: 230, g: 25, b: 75, a:255}, //1
    { r: 60, g: 180, b: 75, a: 255 }, //2
    { r: 255, g: 225, b: 25, a: 255 }, //3
    { r: 0, g: 130, b: 200, a: 255 }, //4
    { r: 245, g: 130, b: 48, a: 255 }, //5
    { r: 145, g: 30, b: 180, a: 255 }, //6
    { r: 70, g: 240, b: 240, a: 255 }, //7
    { r: 240, g: 50, b: 230, a: 255 }, //8
    { r: 210, g: 245, b: 60, a: 255 }, //9
    { r: 250, g: 190, b: 212, a: 255 }, //10
    { r: 0, g: 128, b: 128, a: 255 }, //11
    { r: 220, g: 190, b: 255, a: 255 }, //12
    //{ r: 170, g: 110, b: 40, a: 255 }, //13
    { r: 255, g: 250, b: 200, a: 255 }, //14
    { r: 128, g: 0, b: 0, a: 255 }, //15
    { r: 170, g: 255, b: 195, a: 255 }, //16
    //{ r: 128, g: 128, b: 0, a: 255 }, //17
    { r: 255, g: 215, b: 180, a: 255 }, //18
    { r: 0, g: 0, b: 128, a: 255 }, //19
    //{ r: 128, g: 128, b: 128, a: 255 }, //20
    { r: 255, g: 255, b: 255, a: 255 }, //21
    { r: 0, g: 0, b: 0, a: 255 }, //22
];

var slabThicknessColors = [
    {
        Profile: "VV_150_1200",
        Color: { r: 255, g: 255, b: 0, a: 255 }, //yellow
    },
    {
        Profile: "VV_180_1200",
        Color: { r: 0, g: 128, b: 255, a: 255 }, //blue'ish
    },
    {
        Profile: "VV_200_1200",
        Color: { r: 255, g: 255, b: 255, a: 255 }, //white
    },
    {
        Profile: "VV_220_1200",
        Color: { r: 0, g: 255, b: 0, a: 255 }, //green
    },
    {
        Profile: "VV_265_1200",
        Color: { r: 255, g: 128, b: 0, a: 255 }, //orange
    },
    {
        Profile: "VV_320_1200",
        Color: { r: 128, g: 0, b: 255, a: 255 }, //purple
    },
    {
        Profile: "VV_400_1200",
        Color: { r: 255, g: 0, b: 0, a: 255 }, //red
    }
];

var idsPerPrefixPerModelId = [];

var objectStatuses = [];

var selectionChangedIds = [];

var listObjects = [
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
    //    OdooCode: "V8622.0000FM.0023",
    //    PosInFreight : -1
    //},
    //{
    //    ModelId: "0",
    //    ObjectRuntimeId: 0,
    //    ObjectId: "0",
    //    Guid: "8d14bb4d-9b0e-4cf9-b7d7-a3740b154195",
    //    OdooTcmId: 68561,
    //    OdooPmmId: 150228,
    //    Weight: 8389,
    //    Prefix: "FM",//voor sorteren
    //    PosNmbr: 100,
    //    Rank: 1,
    //    AssemblyName: "FM100",
    //    OdooCode: "V8622.0000FM.0023",
    //    PosInFreight: -1
    //},
    //{
    //    ModelId: "0",
    //    ObjectRuntimeId: 0,
    //    ObjectId: "0",
    //    Guid: "8d14bb4d-9b0e-4cf9-b7d7-a3740b154195",
    //    OdooTcmId: 68562,
    //    OdooPmmId: 150228,
    //    Weight: 8389,
    //    Prefix: "FM",//voor sorteren
    //    PosNmbr: 1600,
    //    Rank: 1,
    //    AssemblyName: "FM1600",
    //    OdooCode: "V8622.0000FM.0023",
    //    PosInFreight: -1
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
    textLabelsOnlyVisible: {
        nl: "Enkel bij zichtbare elementen",
        fr: "Uniquement sur les éléments visibles",
        en: "Only on visible elements"
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
    legendErectedTitle:
    {
        nl: "Gemonteerd:",
        fr: "Assemblé:",
        en: "Erected:"
    },
    legendErectedDescr:
    {
        nl: "merk is gemonteerd op de werf.",
        fr: "l'assemblage a été assemblé au chantier.",
        en: "assembly has been erected on site."
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
    btnShowFreightsVisualizing:
    {
        nl: "Bezig met vrachten te visualiseren",
        fr: "En cours d'afficher les charges",
        en: "Visualizing freights"
    },
    btnVisualizeConcreteFinishVisualizing:
    {
        nl: "Bezig met visualiseren",
        fr: "En cours d'afficher",
        en: "Visualizing"
    },
    btnVisualizeGeneral:
    {
        nl: "Bezig met visualiseren",
        fr: "En cours d'afficher",
        en: "Visualizing"
    },
    errorMsgNoAssemblySelection:
    {
        nl: "Deze plugin werkt enkel met objecten die geselecteerd werden met \"Assembly selection\".",
        fr: "Cette plugin ne fonctionne qu'avec les objets sélectionnés avec \"Sélection d'assemblage\".",
        en: "This plugin only works with objects that were selected with \"Assembly selection\" on."
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
    titleLabelContent:
    {
        nl: "Labelinhoud:",
        fr: "Contenu des étiquettes:",
        en: "Label content:"
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
        nl: "Totaal:",
        fr: "Total:",
        en: "Total:"
    },
    gridTitleTotalWeight:
    {
        nl: "Totaal:",
        fr: "Totale:",
        en: "Total:"
    },
    gridUnitNumber:
    {
        nl: "stuks",
        fr: "pièces",
        en: "pieces"
    },
    phOdooSearch:
    {
        nl: "Voorbeeld: PV1 FM* V1 PS1+2 BV1-10 GU1.5-1.20 BS1.1+3.1 WD200 WWEbis",
        fr: "Exemple: PV1 FM* V1 PS1+2 BV1-10 GU1.5-1.20 BS1.1+3.1 WD200 WWEbis",
        en: "Example: PV1 FM* V1 PS1+2 BV1-10 GU1.5-1.20 BS1.1+3.1 WD200 WWEbis"
    },
    btnGetOdooInfo:
    {
        nl: "Toon Odoo gegevens",
        fr: "Afficher les données Odoo",
        en: "Show Odoo data"
    },
    btnShowFreights:
    {
        nl: "Toon vrachten",
        fr: "Afficher les charges",
        en: "Show freights"
    },
    btnVisualizeConcreteFinish:
    {
        nl: "Visualiseer",
        fr: "Visualiser",
        en: "Visualize"
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
    textDateAvailable:
    {
        nl: "Datum beschikbaar",
        fr: "Date disponible",
        en: "Date available"
    },
    textDateTransported:
    {
        nl: "Datum getransporteerd",
        fr: "Date transporté",
        en: "Date transported"
    },
    textDateErected:
    {
        nl: "Datum gemonteerd",
        fr: "Date assemblé",
        en: "Date erected"
    },
    textBin:
    {
        nl: "Bekisting",
        fr: "Coffrage",
        en: "Bin"
    },
    textLocation:
    {
        nl: "Locatie",
        fr: "Emplacement",
        en: "Location"
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
    textFinish:
    {
        nl: "Afwerking",
        fr: "Finition",
        en: "Finish"
    },
    textMaterial:
    {
        nl: "Materiaal",
        fr: "Matériau",
        en: "Material"
    },
    textDefaultConcreteColor:
    {
        nl: "Standaard betonkleur",
        fr: "Couleur du béton par défaut",
        en: "Default concrete color"
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
        fr: "Action 4: Afficher info des assemblages connus d'Odoo",
        en: "Action 4: Show Odoo data of known assemblies"
    },
    titleAction5:
    {
        nl: "Actie 5: Visualiseer vrachten",
        fr: "Action 5 : Visualiser les charges",
        en: "Action 5: Visualize freights"
    },
    titleAction6:
    {
        nl: "Actie 6: Kleur merken volgens betonkleur",
        fr: "Action 6: Colorer les assemblages en fonction du couleur du béton",
        en: "Action 6: Color assemblies based on concrete colors"
    },
    titleProduction:
    {
        nl: "Productie",
        fr: "Production",
        en: "Production"
    },
    titleAddDirectionArrows:
    {
        nl: "Voeg montagepijlen en stramienen toe aan selectie",
        fr: "Ajouter des flèches de montage et les maillages à la sélection",
        en: "Add erection arrows and grids to selection"
    },
    errorMsgNothingSelected: 
    {
        nl: "Er is niets geselecteerd",
        fr: "Rien n'est sélectionné",
        en: "Nothing selected"
    },
    errorMsgEmptySearchstring:
    {
        nl: "Leg zoekstring, geen selectie uitgevoerd.",
        fr: "Chaîne de recherche vide, aucune sélection n'est effectuée.",
        en: "Empty searchstring, no selection performed."
    },
    titleVisualizeFreightsOnlySelected:
    {
        nl: "Enkel van geselecteerde merken",
        fr: "Uniquement des assemblages sélectionnés",
        en: "Only of selected assemblies"
    },
    divTitleVisualize:
    {
        nl: "Visualiseren",
        fr: "Visualiser",
        en: "Visualize"
    },
    divProductionTitleTT:
    {
        nl: "Visualiseren",
        fr: "Visualiser",
        en: "Visualize"
    },
    divProductionTitleSlabs:
    {
        nl: "Gewelven",
        fr: "Hourdis",
        en: "Hollow core slabs"
    },
    divProductionTitlePanels:
    {
        nl: "Panelen",
        fr: "Panneaux",
        en: "Panels"
    },
    btnVisualizeTTText:
    {
        nl: "TT(T) breedtes",
        fr: "TT(T) largeurs",
        en: "TT(T) widths"
    },
    TTWidth:
    {
        nl: "TT breedte",
        fr: "TT largeur",
        en: "TT width"
    },
    TTTWidth:
    {
        nl: "TTT breedte",
        fr: "TTT largeur",
        en: "TTT width"
    },
    btnVisualizeWWidthText:
    {
        nl: "W breedtes",
        fr: "W largeurs",
        en: "W widths"
    },
    WWidth:
    {
        nl: "W breedte",
        fr: "W largeur",
        en: "W width"
    },
    btnVisualizeWProfile:
    {
        nl: "W profielen",
        fr: "W profils",
        en: "W profiles"
    },
    btnVisualizeWReinforcement:
    {
        nl: "W wapening",
        fr: "W renforcement",
        en: "W reinforcement"
    },
    btnVisualizePTypes:
    {
        nl: "P: prefixen",
        fr: "P: préfixes",
        en: "P: prefixes"
    },
    btnVisualizePFinish:
    {
        nl: "P: afwerking",
        fr: "P: finition",
        en: "P: finish"
    },
    btnVisualizePMaterial:
    {
        nl: "P: materialen",
        fr: "P: matériaux",
        en: "P: materials"
    },
    errorNoResultForSearchstring:
    {
        nl: "Geen resultaten gevonden voor opgegeven zoekterm.",
        fr: "Aucun résultat n'a été trouvé pour la terme de recherche.",
        en: "No results found for given searchstring."
    },
    errorSearchStringContainsSteel:
    {
        nl: "Stalen elementen kunnen niet via Odoo gegevens geselecteerd. Gebruik 'Selecteer merken o.b.v. gekozen filter'.",
        fr: "Éléments en acier ne peuvent pas être sélectionnés via les données Odoo. Utiliser 'Sélectionnez assemblages en fonction de filtre sélectionné'.",
        en: "Steel elements cannot be selected based on Odoo Data. Use 'Select assemblies by selected filter' instead."
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
    'DRUKLAAG',
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
    'SPANSCHROEF',
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
    'VLOERTRACONORD'
];

//#endregion

//#region functions

//#region language related functions

function getUserLang() {
    var userLang = Intl.NumberFormat().resolvedOptions().locale || navigator.language;
    if (userLang.includes("-")) {
        userLang = userLang.split('-')[0];
    }
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

async function addTextMarkups(onlyOnVisibleItems) {
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
        var mobjectsArr = [];
        if(onlyOnVisibleItems)
        {
            var mobjectsArrSelected = await API.viewer.getObjects(selector);
            //console.log("mobjectsArrSelected");
            //console.log(mobjectsArrSelected);
            var mobjectsArrVisible = await API.viewer.getObjects(undefined, {visible: true});
            //console.log("mobjectsArrVisible");
            //console.log(mobjectsArrVisible);
            for(var arr of mobjectsArrSelected)
            {
                var visibleArr = mobjectsArrVisible.find(a => a.modelId === arr.modelId);
                //console.log("visibleArr");
                //console.log(visibleArr);
                if(visibleArr == undefined)
                    continue;
                arr.objects = arr.objects.filter(o => visibleArr.objects.find(vo => vo.id == o.id));
                if(arr.objects.length > 0)
                    mobjectsArr.push(arr);
            }
            //console.log("mobjectsArr");
            //console.log(mobjectsArr);
        }
        else
        {
            mobjectsArr = await API.viewer.getObjects(selector);
            //console.log("mobjectsArr");
            //console.log(mobjectsArr);
        }
        const modelspecs = await API.viewer.getModels("loaded");

        //if (selectedItem === possibleSelectBoxValues[2]) {
        //    //recursive doesn't work => 'temporary' workaround 
        //    var hefoogPropSelector = getPropSelectorByPropnameAndValue("Default.MERKPREFIX", "HEFOOG");
        //    mobjectsArr = await API.viewer.getObjects(hefoogPropSelector);
        //}
        //mobjectsArr type: ModelObjects[]
        //haalt enkel gemeenschappelijk hebben property sets op

        for (const mobjects of mobjectsArr) {
            const modelspec = modelspecs.find(s => s.id === mobjects.modelId);
            const modelPos = modelspec.placement.position;
            //mobjects type: ModelObjects met mobjects.objects type: ObjectProperties[]
            const objectsIds = mobjects.objects.map(o => o.id);
            //const objectsRuntimeIds = await API.viewer.convertToObjectRuntimeIds(mobjects.modelId, objectsIds);
            const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
            console.log("objPropertiesArr");
            console.log(objPropertiesArr);
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
                //else if (selectedItem === possibleSelectBoxValues[2]) {
                //    var leftRight = defaultProperties.properties.find(x => x.name === "COMMENT");
                //    if (leftRight != undefined)
                //        labelText = leftRight.value;
                //    else
                //        continue;
                //}

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
            DevExpress.ui.notify("No relevant assemblies found to add labels.", "info", 5000);
        }
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }
}

async function setAccesBooleans() {
    try {
        var token = await getToken();

        var canReadSlips = false;
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
                canReadSlips = true;
            }
        });

        var canReadSliplines = false;
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "vpb.delivery.slip.line",
                domain: '[["id", ">", "-1"]]',
                limit: 1,
                fields: '["id"]'
            },
            success: function () {
                canReadSliplines = true;
            }
        });

        if (canReadSlips && canReadSliplines) {
            hasAccesToTransport = true;
        }
    }
    catch (ex) {
        console.log("No access to transport data.");
    }

    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    if (username == 'sys_mrp_user' || username == 'krecour' || username == 'mhemeryck' || username == 'jrodenbach' || username == 'jmeeuw')
        hasAccesToFreights = true;
    if (username == 'sys_mrp_user' || username == 'krecour' || username == 'agomes')
        hasAccesToTransportUi = true;

    hasAccesToProduction = true;

    return false;
}

async function checkAssemblySelection() {
    const settings = await API.viewer.getSettings();
    if (!settings.assemblySelection) {
        throw new Error(getTextById("errorMsgNoAssemblySelection"));
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
        Color: { r: 211, g: 211, b: 211, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(modelled);

    var existing = {
        Status: StatusExisting,
        Color: { r: 130, g: 92, b: 79, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(existing);

    var drawn = {
        Status: StatusDrawn,
        Color: { r: 221, g: 160, b: 221, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(drawn);

    var onHold = {
        Status: StatusOnHold,
        Color: { r: 255, g: 0, b: 0, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(onHold);

    var planned = {
        Status: StatusPlanned,
        Color: { r: 255, g: 140, b: 0, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(planned);

    var demoulded = {
        Status: StatusDemoulded,
        Color: { r: 128, g: 128, b: 0, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(demoulded);

    var prodEnded = {
        Status: StatusProductionEnded,
        Color: { r: 255, g: 255, b: 0, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(prodEnded);

    var availForTransport = {
        Status: StatusAvailableForTransport,
        Color: { r: 0, g: 128, b: 255, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(availForTransport);

    var plannedForTransport = {
        Status: StatusPlannedForTransport,
        Color: { r: 0, g: 255, b: 255, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(plannedForTransport);

    var transported = {
        Status: StatusTransported,
        Color: { r: 34, g: 177, b: 76, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(transported);

    var erected = {
        Status: StatusErected,
        Color: { r: 255, g: 0, b: 255, a: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    objectStatuses.push(erected);
}

async function fillPrefixDetails() {
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + access_token },
        data: {
            model: "cust.prefix_to_ce",
            domain: '[["id", ">", "-1"]]',
            fields: '["id", "name", "product_id", "shortcode", "material_type"]',
        },
        success: function (data) {
            for (var record of data) {
                prefixDetails.push({
                    Prefix: record.name,
                    ShortPrefix: record.shortcode,
                    Id: record.id,
                    ProductId: record.product_id[0],
                    MaterialType: record.material_type,
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

async function getAssemblyInfoByCompressedGuids(compressedGuids) {
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

        domainTrimbleConnectMain = '[["project_id", "=", ' + projectId + '],' + domainTrimbleConnectMain + ']';
        var assemblyIds = [];
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: domainTrimbleConnectMain,
                fields: '["id", "name", "rank", "mark_id", "freight", "pos_in_freight_number"]',
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
                            AssemblyQuantity: 0,
                            FreightInfo: `Vr_${record.freight}.${record.pos_in_freight_number}`,
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
    var dayName = date.toLocaleDateString(getUserLang(), { weekday: 'short' });
    return dayName + " " + [(dd > 9 ? '' : '0') + dd, (mm > 9 ? '' : '0') + mm, date.getFullYear(),].join('-');
};

async function getElementsInFreight(freightnumber) {
    //Get project name
    var projectNumber = await getProjectNumber();
    if (projectNumber == undefined)
        return;

    //Authenticate with MUK API
    var token = await getToken();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    //Get elements
    var elements = [];
    var domain;
    if(freightnumber != undefined)
        domain = `[["project_id", "=", ${projectId}], ["freight", "=", "${freightnumber}"], ["state","!=","cancelled"]]`; //, ["mark_id.mark_prefix", "=", "W"]
    else
        domain = `[["project_id", "=", ${projectId}], ["state","!=","cancelled"]]`; //, ["mark_id.mark_prefix", "=", "W"]
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "trimble.connect.main",
            domain: domain,
            fields: '["id", "name", "freight", "pos_in_freight_number"]',
        },
        success: function (data) {
            for (const record of data) {
                elements.push({ Guid: record.name, OdooId: record.id, Freight: record.freight, PosInFreight: record.pos_in_freight_number});
            }
        }
    });

    return elements;
}

async function GetValidFreightNumber(freightnumber) {
    //console.log(freightnumber);
    if (freightnumber) { //https://262.ecma-international.org/5.1/#sec-9.2
        //console.log("Freightnumber is truthy");
        return freightnumber;
    }
    else {
        //console.log("Freightnumber is invalid, getting next available freightnumber");
        var freightNumbers = await getFreightNumbers();
        //console.log("Used freightnumbers:");
        for (var i of freightNumbers)
            //console.log(i);
        var nextFreightNumber = 1;
        if (freightNumbers.length > 0)
            nextFreightNumber = freightNumbers[freightNumbers.length - 1] + 1;
        //console.log(`Found next available freightnumber: ${nextFreightNumber}`);
        return nextFreightNumber;
    }
}

function getFilterTypes() {
    var userLang = getUserLang();
    if (filterTypes[userLang] !== undefined) {
        return filterTypes[userLang];
    }
    else {
        return filterTypes.en;
    }
}

async function getFreightNumbers() {
    //Get project name
    var projectNumber = await getProjectNumber();
    if (projectNumber == undefined)
        return;

    //Authenticate with MUK API
    var token = await getToken();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    //Get freightnumbers
    var freights = [];
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "trimble.connect.main",
            //["project_id.id", "=", "${projectId}"] will perform a join on trimble.connect.main and project.project, ["project_id", "=", "${projectId}"] will not
            domain: `[["project_id", "=", ${projectId}], ["freight", ">", "0"], ["state","!=","cancelled"]]`, //, ["mark_id.mark_prefix", "=", "W"]
            fields: '["freight"]',
        },
        success: function (data) {
            for (const record of data) {
                freights.push(record.freight);
            }
        }
    });

    //sort by integer value https://stackoverflow.com/questions/1063007/how-to-sort-an-array-of-integers-correctly
    freights.sort(function (a, b) {
        return a - b;
    });

    return [...new Set(freights)];
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

function getOdooSteelPackUrl(packId) {
    return `${odooURL}/web#id=${packId}&action=3350&model=project.mark_steel_pack&view_type=form&cids=1&menu_id=2270`;
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
    else if (typeof record.date_erected === 'string' && getDateFromString(record.date_erected) <= referenceDate) {
        return StatusErected;
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
        DevExpress.ui.notify(e, "info", 5000);
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
        odooContent.append(' - Tekeningen: ');
        for (var drawing of odooAssemblyData.Drawings) {
            var imgSrc = "images/Drawing.png";
            if(drawing.Type === "B")
            {
                imgSrc = "images/DrawingB.png";
            }
            else if (drainwg.Type === "W")
            {
                imgSrc = "images/DrawingW.png";
            }
            odooContent.append($(`<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${imgSrc}" width="16" height="16"></a>`));
        }
        odooContent.append(`</p>`);
        if (odooAssemblyData.PlanningType === "TrimbleConnect") {
            var content = $('<div>').append(
                odooContent,
                $(`<p>${getTextById("textNaam")}: <span>${odooAssemblyData.AssemblyName}</span></p>`),
                $(`<p>${getTextById("textDateDrawn")}: <span>${odooAssemblyData.DateDrawn}</span></p>`),
                $(`<p>${getTextById("textDatePlanned")}: <span>${odooAssemblyData.DateProductionPlanned}</span></p>`),
                $(`<p>${getTextById("textDateProductionStarted")}: <span>${odooAssemblyData.DateProductionStarted}</span></p>`),
                $(`<p>${getTextById("textDateDemoulded")}: <span>${odooAssemblyData.DateDemoulded}</span></p>`),
                $(`<p>${getTextById("textDateProductionEnded")}: <span>${odooAssemblyData.DateProductionEnded}</span></p>`),
                $(`<p>${getTextById("textDateTransported")}: <span>${odooAssemblyData.DateTransported}</span></p>`),
                $(`<p>${getTextById("textDateErected")}: <span>${odooAssemblyData.DateErected}</span></p>`),
                $(`<p>${getTextById("textLocation")}: <span>${odooAssemblyData.Location}</span></p>`),
                $(`<p>${getTextById("textBin")}: <span>${odooAssemblyData.Bin}</span></p>`),
                $(`<p>${getTextById("textProjectpart")}: <span>${odooAssemblyData.Unit}</span></p>`),
                $(`<p>${getTextById("textMass")} [kg]: <span>${odooAssemblyData.Mass}</span></p>`),
                $(`<p>${getTextById("textVolume")} [m³]: <span>${odooAssemblyData.Volume}</span></p>`),
                $(`<p>${getTextById("textLength")} [mm]: <span>${odooAssemblyData.Length}</span></p>`),
                $(`<p>${getTextById("textProfile")}: <span>${odooAssemblyData.Profile}</span></p>`),
                $(`<p>${getTextById("textFreight")}: <span>${odooAssemblyData.Freight}</span></p>`),
                $(`<p>${getTextById("textFinish")}: <span>${odooAssemblyData.Finish}</span></p>`),
                $(`<p>${getTextById("textMaterial")}: <span>${odooAssemblyData.Material}</span></p>`),
            );
            if (odooAssemblyData.CableLength != undefined && odooAssemblyData.CableLength !== "") {
                content.append($(`<p>Cable length: <span>${odooAssemblyData.CableLength}</span></p>`));
            }
        }
        else if (odooAssemblyData.PlanningType === "Steel") {
            var htmlPacks = `<p><table class="tablePopup"><tr><th>Pack</th><th>Locatie</th><th>${getTextById("textDateAvailable")}</th><th>${getTextById("textDateTransported")}</th></tr>`;
            for (var pack of odooAssemblyData.SteelPacks) {
                var url = `<a href="${getOdooSteelPackUrl(pack.OdooId)}" target="_blank" rel="noopener noreferrer">${pack.ShortName}</a>`;
                htmlPacks += `<tr><td>${url}</td><td>${pack.Location}</td><td>${pack.DateReady}</td><td>${pack.DateDone}</td></tr>`;
            }
            htmlPacks += "</table></p>";
            var content = $('<div>').append(
                odooContent,
                $(`<p>${getTextById("textNaam")}: <span>${odooAssemblyData.AssemblyName}</span></p>`),
                $(`<p>${getTextById("textDateDrawn")}: <span>${odooAssemblyData.DateDrawn}</span></p>`),
                $(`<p>${getTextById("textMass")} [kg]: <span>${odooAssemblyData.Mass}</span></p>`),
                $(`<p>${getTextById("textLength")} [mm]: <span>${odooAssemblyData.Length}</span></p>`),
                $(`<p>${getTextById("textProfile")}: <span>${odooAssemblyData.Profile}</span></p>`),
                $(`<p>${getTextById("textMaterial")}: <span>${odooAssemblyData.Material}</span></p>`),
                htmlPacks,
            );
        }
        return content;
    }
    else {
        return $('<div>').append(
            $(`<p>${getTextById("textNoInfoFound")}</p>`),
        );
    }
};

const popupContentTemplateLegend = function (items) {
    var content = $('<div>');
    for (item of items) {
        content.append($(`</p><span style="background-color:rgb(${item.Color.r},${item.Color.g},${item.Color.b})">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span> : ${item.Text}</span></p>`));
    }

    return content;
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
        DevExpress.ui.notify(e, "info", 5000);
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

    try {
        await checkAssemblySelection();
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }

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
                    ValidForNewSlip: false,
                    ValidForNewFreight: false,
                    Profile: "",
                    ReinforcementType: "",
                    SlipName: "",
                    OdooSlipId: -1,
                    Freight: -1,
                    PosInFreight: -1,
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

        //console.log('tempSelectedObjects.length: ');
        //console.log(tempSelectedObjects.length);
        for (var i = 0; i < tempSelectedObjects.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
            //console.log('i: ');
            //console.log(i);
            if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
            var domainTrimbleConnectMain = "";

            for (var j = i; j < tempSelectedObjects.length && j < i + fetchLimit; j++) {
                //console.log('j: ');
                //console.log(j);
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
            domainTrimbleConnectMain = '[["project_id", "=", ' + projectId + '],' + domainTrimbleConnectMain + "]";
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
                    fields: '["id", "mark_id", "name", "rank", "mark_available", "date_transported", "freight", "pos_in_freight_number"]',
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
                            selectedObject.Freight = record.freight, //TODO: change , to ;
                            selectedObject.PosInFreight = record.pos_in_freight_number, //TODO: change , to ;
                            selectedObject.ValidForNewFreight = record.freight == 0;
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
                                object.ValidForNewSlip = object.AvailableForTransport && object.DateTransported === "";
                                object.Profile = record.mark_profile;
                                object.ReinforcementType = record.mark_reinf_type ? record.mark_reinf_type : "";
                            }
                        }
                    }
                });

                if (hasAccesToTransport) {
                    var transportedObjects = tempSelectedObjects;//.filter(x => !x.ValidForNewSlip);
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
                        domainSliplines = `[["trimble_connect_id.project_id", "=", ${projectId}],["slip_id.state", "!=", "cancel"],${domainSliplines}]`;
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
                                        object.ValidForNewSlip = false;
                                    }
                                }
                            }
                        });
                    }
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
        listObjects.length = 0;
        //for (var o of tempSelectedObjects)
        //    selectedObjects.push(o);
        listObjects.push(...tempSelectedObjects.filter(o => o.OdooTcmId != -1).sort(function (a, b) { return a.PosInFreight - b.PosInFreight; }));
        setPosInFreight();
        clearDataGridProductionSorting();
        dataGridMontage.dxDataGrid("refresh");
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

function setPosInFreight() {
    for (var i = 0; i < listObjects.length; i++)
        listObjects[i].PosInFreight = i + 1;
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
                    domain: '[["project_id", "=", ' + id + '],["id", ">", "' + lastId + '"]]',
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
        //console.log('compressedGuids');
        //console.log(compressedGuids);
        var selectionType = "set";
        for (var model of models) {
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(model.id, compressedGuids);
            runtimeIds = runtimeIds.filter(x => x != undefined);
            //console.log('runtimeIds');
            //console.log(runtimeIds);
            if (runtimeIds == undefined || runtimeIds.length == 0)
                continue;
            var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: runtimeIds }] };
            await API.viewer.setSelection(selector, selectionType);
            selectionType = "add";
            //console.log("out of for");
        }
        //console.log("end");
    }
}

function getConcretecolorFromOdooStr(odooColor3DStr) {
    var result = odooColor3DStr.match(/(\d+).(\d+).(\d+).(\d+)/g);
    if (result != null) {
        var splitArray = odooColor3DStr.trim().split(";");
        var r = parseInt(splitArray[0]);
        var g = parseInt(splitArray[1]);
        var b = parseInt(splitArray[2]);
        if (splitArray.length == 3)
            return { r: r, g: g, b: b };
        else if (splitArray.length == 4) {
            var a = parseInt(splitArray[3]);
            return { r: r, g: g, b: b, a: a };
        }
    }
    return undefined;
}

async function visualizeConcreteFinishes() {
    try {
        //Get project name
        var projectNumber = await getProjectNumber();
        if (projectNumber == undefined)
            return;

        //Authenticate with MUK API
        var token = await getToken();

        //Get project ID
        var projectId = await GetProjectId(projectNumber);

        //Get finish values
        var finishes = [];
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "project.master_marks",
                domain: `[["project_id", "=", ${projectId}]]`, //, ["mark_id.mark_prefix", "=", "W"]
                fields: '["id", "mark_comment"]',
            },
            success: function (odooData) {
                for (var record of odooData) {
                    if (!record.mark_comment)
                        continue;
                    var comment = record.mark_comment.trim();
                    if (!comment)
                        continue;

                    var finish = finishes.find(x => x === comment);
                    if (finish == undefined) {
                        finishes.push(record.mark_comment);
                    }
                }
            }
        });

        var legendItems = [];
        var defaultConcreteColor = { r: 128, g: 128, b: 128, a: 255 };
        legendItems.push({ Text: getTextById("textDefaultConcreteColor"), Color: defaultConcreteColor });
        //Color everything grey
        var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
        for (const mobjects of allObjects) {
            var modelId = mobjects.modelId;
            const objectsRuntimeIds = mobjects.objects.map(o => o.id);
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: defaultConcreteColor });
        }

        for (var finish of finishes) {
            var colorToUse = defaultConcreteColor;

            //Get color from Odoo
            var finishToSearchFor = finish.replace("G", "GL").trim();
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "cust.silex_data",
                    domain: `[["name", "=ilike", "${finishToSearchFor}"]]`,
                    fields: '["id", "color3D"]',
                },
                success: function (odooData) {
                    if (odooData.length > 0) {
                        //console.log(odooData[0].color3D);
                        if (odooData[0].color3D !== false) {
                            var color = getConcretecolorFromOdooStr(odooData[0].color3D);
                            if (color != undefined)
                                colorToUse = color;
                        }
                        else {
                            colorToUse = { r: 128, g: 128, b: 128, a: 128 };
                        }
                    }
                }
            });

            //Get elements with this finish
            var guids = [];
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "trimble.connect.main",
                    domain: `[["project_id", "=", ${projectId}], ["mark_id.mark_comment", "=ilike", "${finish}"]]`,
                    fields: '["id", "name"]',
                },
                success: function (odooData) {
                    for (var record of odooData) {
                        guids.push(record.name);
                    }
                }
            });

            //Color elements
            var validGuids = guids.filter(x => x != undefined && x !== "");
            if (validGuids.length > 0) {
                var models = await API.viewer.getModels("loaded");
                var compressedGuids = validGuids.map(x => Guid.fromFullToCompressed(x));
                for (var model of models) {
                    var runtimeIds = await API.viewer.convertToObjectRuntimeIds(model.id, compressedGuids);
                    if (runtimeIds.length == 0)
                        continue;
                    var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: runtimeIds }] };
                    await API.viewer.setObjectState(selector, { color: colorToUse });
                    if (colorToUse != defaultConcreteColor) {
                        legendItems.push({ Text: finishToSearchFor, Color: colorToUse });
                    }
                }
            }
        }

        popup.option({
            contentTemplate: () => popupContentTemplateLegend(legendItems),
            height: 100 + legendItems.length * 30
        });
        popup.show();
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }
}

async function visualizeFreights() {
    try {
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
                domain: '[["project_id", "=", ' + projectId + '], ["freight", ">=", "0"]]', //, ["mark_id.mark_prefix", "=", "W"]
                order: 'freight',
                fields: '["id", "name", "freight", "mark_id", "mark_available"]',
            },
            success: function (data) {
                for (const record of data) {
                    if (record.mark_id[0] == undefined || record.mark_id[0] == false) {
                        continue;
                    }
                    var freight = freights.find(x => x.FreightNumber == record.freight);
                    if (freight != undefined) {
                        if (record.mark_available)
                            freight.ObjectIdsAvailable.push(Guid.fromFullToCompressed(record.name));
                        else
                            freight.ObjectIdsUnavailable.push(Guid.fromFullToCompressed(record.name));
                        freight.MarkIds.push(record.mark_id[0]);
                        freight.Guids.push(record.name);
                    }
                    else {
                        var newFreight = {
                            FreightNumber: record.freight,
                            Guids: [],
                            ObjectIdsAvailable: [],//objectIds = compressed ifc ids
                            ObjectRuntimeIdsAvailable: [],//o.id = runtimeId = number
                            ObjectIdsUnavailable: [],//objectIds = compressed ifc ids
                            ObjectRuntimeIdsUnavailable: [],//o.id = runtimeId = number
                            MarkIds: [record.mark_id[0]],
                            Surface: 0,
                        };
                        if (record.mark_available)
                            newFreight.ObjectIdsAvailable = [Guid.fromFullToCompressed(record.name)];//objectIds = compressed ifc ids
                        else
                            newFreight.ObjectIdsUnavailable = [Guid.fromFullToCompressed(record.name)];//objectIds = compressed ifc ids
                        newFreight.Guids.push(record.name);
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

        const selection = await API.viewer.getSelection();
        const selector = {
            modelObjectIds: selection
        };
        const mobjectsArr = await API.viewer.getObjects(selector);
        var selectedGuids = [];
        var selectedRuntimeIds = [];
        for (const mobjects of mobjectsArr.filter(x => x.objects.length > 0)) {
            const objectRuntimeIds = mobjects.objects.map(o => o.id); //o.id = runtimeId = number
            const objectIds = await API.viewer.convertToObjectIds(mobjects.modelId, objectRuntimeIds);//objectIds = compressed ifc ids
            //console.log(objectRuntimeIds);
            selectedGuids.push(...objectIds.map(x => Guid.fromCompressedToFull(x)));
            selectedRuntimeIds = selectedRuntimeIds.concat(objectRuntimeIds);
        }

        var onlySelected = checkBoxVisualizeFreightsOnlySelected.dxCheckBox("instance").option("value");
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

                var colorToUse;
                if (freight.FreightNumber == 0)
                    colorToUse = { r: 128, g: 128, b: 128, a: 255 };
                else {
                    colorToUse = freightColors[freight.FreightNumber % freightColors.length];
                    colorToUse = { r: colorToUse.r, g: colorToUse.g, b: colorToUse.b, a: 255 };
                }

                //Set element color per freight
                colorToUse.a = 255;
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsAvailable }] }, { color: colorToUse });
                colorToUse.a = 128;
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsUnavailable }] }, { color: colorToUse });

                //Don't insert a label for freight number 0, clutters the 3D model
                if (freight.FreightNumber == 0)
                    continue;

                const intersection = freight.Guids.filter(value => selectedGuids.includes(value));
                if (Boolean(onlySelected) && (intersection == undefined || intersection.length == 0))
                    continue;

                //Add labels per freight
                var allCogCoordinates = [];
                const modelPos = model.placement.position;
                var runtimeIdsToTakeIntoAccount = [];
                if (Boolean(onlySelected))
                    runtimeIdsToTakeIntoAccount = allRuntimeIds.filter(value => selectedRuntimeIds.includes(value))
                else
                    runtimeIdsToTakeIntoAccount = allRuntimeIds;
                const objPropertiesArr = await API.viewer.getObjectProperties(modelId, runtimeIdsToTakeIntoAccount);
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
            DevExpress.ui.notify("Geen vrachten gevonden", "info", 5000);
        }
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }
    
}

//#region Odoo

var access_token = "";
var refresh_token = "";
var access_token_expiretime;
var client_id = "3oVDFZt2EVPhAOfQRgsRDYI9pIcdcdTGYR7rUSST";
var client_secret = "PXthv4zShfW5NORk4bKFgr6O1dlYTxqD8KwFlx1S";
async function getToken() {
    checkUsernameAndPassword();

    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    var password = odooPasswordTextbox.dxTextBox("instance").option("value");

    if (refresh_token !== "" && access_token_expiretime != undefined && access_token_expiretime.getTime() < Date.now() + 60 * 1000) {
        //refresh_token might be expired aswel => expected to fail
        //console.log("Refreshing token");
        //console.log("Token: ");
        //console.log(access_token);
        //console.log("tokenExpiretime.getTime()");
        //console.log(access_token_expiretime.getTime());
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
                access_token = odooData.access_token;
                refresh_token = odooData.refresh_token;
                access_token_expiretime = new Date(Date.now() + odooData.expires_in * 1000);
                refreshSuccesful = true;
                //console.log("odoo data:");
                //console.log(odooData);
                //console.log("refresh success");
            },
        });
        if (!refreshSuccesful) {
            //console.log("refresh failed");
            access_token = "";
            refresh_token = "";
            access_token_expiretime = undefined;
        }
        //console.log("End refresh token");
    }
    if (access_token === "") {
        //console.log("Fetching new token");
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
                access_token = data.access_token;
                refresh_token = data.refresh_token;
                access_token_expiretime = new Date(Date.now() + data.expires_in * 1000);
                //console.log("tokenExpiretime:");
                //console.log(access_token_expiretime);
            }
        });
        //console.log("Token received");
    }
    return access_token;
}

var lastUpdate = "";
var modelIsColored = false;
async function getRecentOdooData() {
    if (!modelIsColored)
        return;

    try {
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
                    domain: '[["project_id", "=", ' + id + ']]',
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
                    domain: '[["project_id", "=", ' + id + '],["write_date",">=","' + lastUpdate + '"]]',
                    order: 'write_date desc',
                    fields: '["id", "write_date", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "date_erected", "state", "mark_available"]',
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

                        var recordsPerStatus = [];
                        for (const objStatus of objectStatuses) {
                            recordsPerStatus.push({ Status: objStatus.Status, Records: [], ModifiedCompressedIfcGuids: [] });
                        }

                        for (const record of data) {
                            var statusWithRecords = recordsPerStatus.find(s => s.Status === getStatus(record, referenceDate));
                            statusWithRecords.Records.push(record);
                        }

                        for (const statusWithRecords of recordsPerStatus.filter(r => r.Records.length > 0)) {
                            var objStatus = objectStatuses.find(o => o.Status === statusWithRecords.Status);

                            for (const record of statusWithRecords.Records) {
                                var compressedIfcGuid = Guid.fromFullToCompressed(record.name);
                                if (objStatus.CompressedIfcGuids.indexOf(compressedIfcGuid) == -1) {
                                    removeStatusFromCompressedIfcGuids(compressedIfcGuid);
                                    objStatus.CompressedIfcGuids.push(compressedIfcGuid);

                                    removeStatusFromGuids(record.name);
                                    objStatus.Guids.push(record.name);

                                    statusWithRecords.ModifiedCompressedIfcGuids.push(compressedIfcGuid);
                                }
                            }
                        }

                        for (const statusWithRecords of recordsPerStatus.filter(r => r.ModifiedCompressedIfcGuids.length > 0)) {
                            var colorToUse = getColorByStatus(statusWithRecords.Status);

                            var models = await API.viewer.getModels("loaded");
                            for (var model of models) {
                                var modelId = model.id;
                                var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, statusWithRecords.ModifiedCompressedIfcGuids);
                                if (runtimeIds != undefined && runtimeIds.length > 0) {
                                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: colorToUse, visible: true });
                                    elementsColored = true;
                                }
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
    catch (e) {
        console.log(e);
    }
}

function removeStatusFromCompressedIfcGuids(compressedIfcGuid) {
    for (const objStatus of objectStatuses) {
        var index = objStatus.CompressedIfcGuids.indexOf(compressedIfcGuid);
        if (index != -1) {
            objStatus.CompressedIfcGuids.splice(index, 1);
            console.log("IfcGuid " + compressedIfcGuid + " removed from CompressedIfcGuids as " + objStatus.Status);
            break;
        }
    }
}

function removeStatusFromGuids(guid) {
    for (const objStatus of objectStatuses) {
        var index = objStatus.Guids.indexOf(guid);
        if (index != -1) {
            objStatus.Guids.splice(index, 1);
            console.log("Guid " + guid + " removed from Guids as " + objStatus.Status);
            break;
        }
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
                domain: '["&", "|", ["active","=",True], ["active","=",False], ["project_identifier", "=", "' + projectNumber + '"]]',
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

var checkBoxBasicLabelsOnlyVisible = $('#checkedBasicLabelsOnlyVisible').dxCheckBox({
    value: true,
});

var checkBoxOdooLabelsOnlyVisible = $('#checkedOdooLabelsOnlyVisible').dxCheckBox({
    value: true,
});

var checkBoxDirectionArrows = $('#checkedAddDirectionArrows').dxCheckBox({
    value: true,
});


var checkBoxVisualizeFreightsOnlySelected = $('#checkedVisualizeFreightsOnlySelected').dxCheckBox({
    value: false,
});

const popup = $('#popup').dxPopup({
    contentTemplate: popupContentTemplate,
    width: 'auto',
    height: 570,
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

var datePicker = $('#date').dxDateBox({
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
    inputAttr: {
        autocomplete: 'on',
        name: 'password'
    }
});

var odooSearchTextBox = $('#placeholderOdooSearch').dxTextBox({
    placeholder: getTextById("phOdooSearch"),
});

var odooUsernameTextbox = $('#placeholderOdooUsername').dxTextBox({
    placeholder: getTextById("phOdooUsername"),
    inputAttr: {
        autocomplete: 'on',
        name: 'username'
    }
});

const prefixSelectionTagBox = $('#prefixSelection').dxTagBox({
    items: prefixes,
    showSelectionControls: true,
    applyValueMode: 'useButtons',
    //onValueChanged: function () {
    //    DevExpress.ui.notify("The button was clicked", "info", 5000);
    //},
});

const propertyNameTextBox = $('#placeholderPropertyName').dxTextBox({
    placeholder: getTextById("phPropertyname"),
});

const propertyValueTextBox = $('#placeholderPropertyValue').dxTextBox({
    placeholder: getTextById("phPropertyvalue"),
});

const freightNumberBox = $('#placeholderFreightNmbr').dxNumberBox({
    width: 50,
    onValueChanged: selectFreightElements,
});

async function selectFreightElements(data) {
    var elementsInFreight = await getElementsInFreight(data.value);
    var guids = elementsInFreight.map(x => x.Guid);
    await selectGuids(guids);
}

const newFreightNumberBox = $('#placeholderNewFreightNmbr').dxNumberBox({
    value: "",
    width: 50
});

//#endregion

//#region buttons

async function colorPanelsByPrefix() {
    var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
    for (const mobjects of allObjects) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: { r: 185, g: 122, b: 87, a: 255 }, visible: false });
    }

    var colorPerPrefix = [
        {
            Prefix: "PV",
            Color: { r: 211, g: 211, b: 211, a: 255 }
        },
        {
            Prefix: "PS",
            Color: { r: 255, g: 255, b: 0, a: 255 }
        },
        {
            Prefix: "KM",
            Color: { r: 128, g: 0, b: 255, a: 255 }
        },
        {
            Prefix: "PLAAT",
            Color: { r: 0, g: 0, b: 255, a: 255 }
        }
    ];

    var legendItems = [];
    for (var colorPrefix of colorPerPrefix) {
        var elementsColored = false;
        const objectsPrefix = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': colorPrefix.Prefix } } });
        for (const mobjects of objectsPrefix) {
            var modelId = mobjects.modelId;
            const objectsRuntimeIds = mobjects.objects.map(o => o.id);
            if (objectsRuntimeIds.length == 0)
                continue;
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: colorPrefix.Color, visible: true });
            elementsColored = true;
        }

        if (elementsColored)
            legendItems.push({ Text: colorPrefix.Prefix, Color: colorPrefix.Color });
    }

    popup.option({
        contentTemplate: () => popupContentTemplateLegend(legendItems),
        height: 100 + legendItems.length * 30
    });
    popup.show();
}

async function colorPanelsByFinish() {
    //Authenticate with MUK API
    var token = await getToken();

    //Get project name
    var projectNumber = await getProjectNumber();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    var finishes = [];
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "project.master_marks",
            domain: `[["project_id", "=", ${projectId}], ["mark_comment", "ilike", "S%"], 
                    "|", ["mark_prefix", "=", "PV"], "|", ["mark_prefix", "=", "PS"], "|", ["mark_prefix", "=", "KM"], ["mark_prefix", "=", "PLAAT"]]`,
            fields: '["id", "mark_comment"]',
        },
        success: function (data) {
            for (const record of data) {
                if (!finishes.includes(record.mark_comment))
                    finishes.push(record.mark_comment)
            }
        }
    });

    finishes = [...new Set(finishes)];

    var guidsPerFinish = [];
    for (var finish of finishes) {
        var guids = [];
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: `[["project_id", "=", ${projectId}], ["mark_id.mark_comment", "=", "${finish}"]]`,
                fields: '["id", "name"]',
            },
            success: function (data) {
                for (const record of data) {
                    guids.push(record.name);
                }
            }
        });
        guidsPerFinish.push({ Finish: finish, Guids: guids });
    }

    var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
    for (const mobjects of allObjects) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: { r: 185, g: 122, b: 87, a: 255 }, visible: false });
    }

    var legendItems = [];
    for (var guidsFinish of guidsPerFinish) {
        var colorToUse = freightColors[guidsPerFinish.indexOf(guidsFinish) % freightColors.length];
        colorToUse.a = 255;
        var elementsColored = false;
        var models = await API.viewer.getModels("loaded");
        if (guidsFinish.Guids.length == 0)
            continue;
        var compressedGuids = guidsFinish.Guids.map(x => Guid.fromFullToCompressed(x));
        for (var model of models) {
            var modelId = model.id;
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedGuids);
            if (runtimeIds != undefined && runtimeIds.length > 0) {
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: colorToUse, visible: true });
                elementsColored = true;
            }
        }

        if (elementsColored)
            legendItems.push({ Text: guidsFinish.Finish, Color: colorToUse });
    }

    popup.option({
        contentTemplate: () => popupContentTemplateLegend(legendItems),
        height: 100 + legendItems.length * 30
    });
    popup.show();
}

async function colorPanelsByMaterial(){
    //Authenticate with MUK API
    var token = await getToken();

    //Get project name
    var projectNumber = await getProjectNumber();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    var materials = [];
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "project.master_marks",
            domain: `[["project_id", "=", ${projectId}], 
                    "|", ["mark_prefix", "=", "PV"], "|", ["mark_prefix", "=", "PS"], "|", ["mark_prefix", "=", "KM"], ["mark_prefix", "=", "PLAAT"]]`,
            fields: '["id", "mark_material"]',
        },
        success: function (data) {
            for (const record of data) {
                if (!materials.includes(record.mark_material))
                    materials.push(record.mark_material)
            }
        }
    });

    materials = [...new Set(materials)];

    var guidsPerMaterial = [];
    for (var material of materials) {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: `[["project_id", "=", ${projectId}], ["mark_id.mark_material", "=", "${material}"]]`,
                fields: '["id", "name"]',
            },
            success: function (data) {
                var guids = [];
                for (const record of data) {
                    guids.push(record.name);
                }
                guidsPerMaterial.push({ Material: material, Guids: guids });
            }
        });
    }

    var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
    for (const mobjects of allObjects) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: { r: 185, g: 122, b: 87, a: 255 }, visible: false });
    }

    var legendItems = [];
    for (var guidsMaterial of guidsPerMaterial) {
        var colorToUse = freightColors[guidsPerMaterial.indexOf(guidsMaterial) % freightColors.length];
        colorToUse.a = 255;
        var elementsColored = false;
        var models = await API.viewer.getModels("loaded");
        if (guidsMaterial.Guids.length == 0)
            continue;
        var compressedGuids = guidsMaterial.Guids.map(x => Guid.fromFullToCompressed(x));
        for (var model of models) {
            var modelId = model.id;
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedGuids);
            if (runtimeIds != undefined && runtimeIds.length > 0) {
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: colorToUse, visible: true });
                elementsColored = true;
            }
        }

        if (elementsColored)
            legendItems.push({ Text: guidsMaterial.Material, Color: colorToUse });
    }

    popup.option({
        contentTemplate: () => popupContentTemplateLegend(legendItems),
        height: 100 + legendItems.length * 30
    });
    popup.show();
}

async function colorWByReinforcement() {
    //Authenticate with MUK API
    var token = await getToken();

    //Get project name
    var projectNumber = await getProjectNumber();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    var reinf_types = [];
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "project.master_marks",
            domain: `[["project_id", "=", ${projectId}],["mark_prefix", "=", "W"]]`,
            fields: '["id", "mark_reinf_type"]',
        },
        success: function (data) {
            for (const record of data) {
                if (!reinf_types.includes(record.mark_reinf_type))
                    reinf_types.push(record.mark_reinf_type)
            }
        }
    });

    reinf_types = [...new Set(reinf_types)];

    var guidsPerReinftype = [];
    for (var reinfType of reinf_types) {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: `[["project_id", "=", ${projectId}], ["mark_id.mark_reinf_type", "=", "${reinfType}"]]`,
                fields: '["id", "name"]',
            },
            success: function (data) {
                var guids = [];
                for (const record of data) {
                    guids.push(record.name);
                }
                guidsPerReinftype.push({ ReinfType: reinfType, Guids: guids });
            }
        });
    }

    var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
    for (const mobjects of allObjects) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: { r: 185, g: 122, b: 87, a: 255 }, visible: false });
    }

    var legendItems = [];
    for (var guidsReinftype of guidsPerReinftype) {
        var colorToUse = freightColors[guidsPerReinftype.indexOf(guidsReinftype) % freightColors.length];
        colorToUse.a = 255;
        var elementsColored = false;
        var models = await API.viewer.getModels("loaded");
        if (guidsReinftype.Guids.length == 0)
            continue;
        var compressedGuids = guidsReinftype.Guids.map(x => Guid.fromFullToCompressed(x));
        for (var model of models) {
            var modelId = model.id;
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedGuids);
            if (runtimeIds != undefined && runtimeIds.length > 0) {
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: colorToUse, visible: true });
                elementsColored = true;
            }
        }

        if (elementsColored)
            legendItems.push({ Text: guidsReinftype.ReinfType, Color: colorToUse });
    }

    popup.option({
        contentTemplate: () => popupContentTemplateLegend(legendItems),
        height: 100 + legendItems.length * 30
    });
    popup.show();
}

async function colorWByProfile() {
    //Authenticate with MUK API
    var token = await getToken();

    //Get project name
    var projectNumber = await getProjectNumber();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    var profiles = [];
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "project.master_marks",
            domain: `[["project_id", "=", ${projectId}],["mark_prefix", "=", "W"]]`,
            fields: '["id", "mark_profile"]',
        },
        success: function (data) {
            for (const record of data) {
                if (!profiles.includes(record.mark_profile))
                    profiles.push(record.mark_profile)
            }
        }
    });

    profiles = [...new Set(profiles.sort())];

    var guidsPerProfile = [];
    for (var profile of profiles) {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: `[["project_id", "=", ${projectId}], ["mark_id.mark_profile", "=", "${profile}"]]`,
                fields: '["id", "name"]',
            },
            success: function (data) {
                var guids = [];
                for (const record of data) {
                    guids.push(record.name);
                }
                guidsPerProfile.push({ Profile: profile, Guids: guids });
            }
        });
    }

    var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
    for (const mobjects of allObjects) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: { r: 185, g: 122, b: 87, a: 255 }, visible: false });
    }

    var legendItems = [];
    for (var guidsProfile of guidsPerProfile) {
        var colorToUse = { r: 0, g: 0, b: 0, a: 255 };
        var profileColorCombo = slabThicknessColors.find(x => x.Profile === guidsProfile.Profile);
        if (profileColorCombo != undefined)
            colorToUse = profileColorCombo.Color; // freightColors[guidsPerProfile.indexOf(guidsProfile) % freightColors.length]
        colorToUse.a = 255;
        var elementsColored = false;
        var models = await API.viewer.getModels("loaded");
        if (guidsProfile.Guids.length == 0)
            continue;
        var compressedGuids = guidsProfile.Guids.map(x => Guid.fromFullToCompressed(x));
        for (var model of models) {
            var modelId = model.id;
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedGuids);
            if (runtimeIds != undefined && runtimeIds.length > 0) {
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: colorToUse, visible: true });
                elementsColored = true;
            }
        }

        if (elementsColored)
            legendItems.push({ Text: guidsProfile.Profile, Color: colorToUse });
    }

    popup.option({
        contentTemplate: () => popupContentTemplateLegend(legendItems),
        height: 100 + legendItems.length * 30
    });
    popup.show();
}

$('#btnVisualizePTypesDivId').dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizePTypes"), 
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        await colorPanelsByPrefix();

        await showDirectionArrows();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizePTypes"));
    },
});

$('#btnVisualizePFinishDivId').dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizePFinish"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        await colorPanelsByFinish();

        await showDirectionArrows();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizePFinish"));
    },
});

$('#btnVisualizePMaterialDivId').dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizePMaterial"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        await colorPanelsByMaterial();

        await showDirectionArrows();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizePMaterial"));
    },
});

$('#btnFirstFreightsDivId').dxButton({
    icon: 'chevrondoubleleft',
    onClick: async function (data) {
        var freightNumbers = await getFreightNumbers();
        var freightNumber = 0;
        if (freightNumbers.length > 0)
            freightNumber = freightNumbers[0];
        freightNumberBox.dxNumberBox("instance").option('value', freightNumber);
    },
});

$('#btnPreviousFreightsDivId').dxButton({
    icon: 'chevronleft',
    onClick: async function (data) {
        var previousFreightNumber = freightNumberBox.dxNumberBox("instance").option("value");
        var freightNumbers = await getFreightNumbers();
        var freightNumber = freightNumbers.findLast(x => x < previousFreightNumber);
        if (freightNumber != undefined)
        {
            freightNumberBox.dxNumberBox("instance").option('value', freightNumber);
        }
    },
});

$('#btnNextFreightsDivId').dxButton({
    icon: 'chevronright',
    onClick: async function (data) {
        var previousFreightNumber = freightNumberBox.dxNumberBox("instance").option("value");
        var freightNumbers = await getFreightNumbers();
        var freightNumber = freightNumbers.find(x => x > previousFreightNumber);
        if (freightNumber != undefined) {
            freightNumberBox.dxNumberBox("instance").option('value', freightNumber);
        }
    },
});

$('#btnLastFreightsDivId').dxButton({
    icon: 'chevrondoubleright',
    onClick: async function (data) {
        var freightNumbers = await getFreightNumbers();
        var freightNumber = 0;
        if (freightNumbers.length > 0)
            freightNumber = freightNumbers[freightNumbers.length - 1];
        freightNumberBox.dxNumberBox("instance").option('value', freightNumber); 
    },
});

async function setOdooFreightNumber(ids, freightnumber) {
    //Authenticate with MUK API
    var token = await getToken();

    await $.ajax({
        type: "PUT",
        url: odooURL + "/api/v1/write",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "trimble.connect.main",
            values: `{"freight": "${freightnumber}"}`,
            ids: `[${ids.join(',')}]`
        },
        success: function (odooData) {
            //console.log(odooData);
        }
    });
}

async function setOdooFreightNumberAndPosInFreight(ids, freightnumber, posInFreight) {
    //Authenticate with MUK API
    var token = await getToken();

    await $.ajax({
        type: "PUT",
        url: odooURL + "/api/v1/write",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "trimble.connect.main",
            values: `{"freight": "${freightnumber}", "pos_in_freight_number": "${posInFreight}"}`,
            ids: `[${ids.join(',')}]`
        },
        success: function (odooData) {
            //console.log(odooData);
        }
    });
}

$('#btnSaveFreightDivId').dxButton({
    icon: 'save',
    onClick: async function (data) {
        //-- prevent automatic coloring from mixing with freight colors
        modelIsColored = false; 
        //-- get alle elements with current freight number
        var freightNumber = newFreightNumberBox.dxNumberBox("instance").option("value");
        freightNumber = await GetValidFreightNumber(freightNumber);
        //console.log(`setting elements with freight ${freightNumber}`);
        var elementsToModify = await getElementsInFreight(freightNumber);
        //console.log(`found ${elementsToModify.length} elements to modify`);
        //-- remove freight info of the elements that are in this freight atm (set as 0)
        for (var ele of elementsToModify) {
            ele.Freight = 0;
            ele.PosInFreight = 0;
        }
        //-- set freight number of selected (= elements that will be put in this freight)
        //console.log(`found ${selectedObjects.length} selected objects to modify`);
        for (var ele of listObjects) {
            var existingEle = elementsToModify.find(x => x.Guid === ele.Guid);
            if (existingEle == undefined) {
                elementsToModify.push({
                    Guid: ele.Guid,
                    OdooId: ele.OdooTcmId,
                    Freight: freightNumber,
                    PosInFreight: ele.PosInFreight,
                });
            }
            else {
                existingEle.Freight = freightNumber;
                existingEle.PosInFreight = ele.PosInFreight;
            }
        }

        for (var elementToModify of elementsToModify) {
            var ids = [];
            ids.push(elementToModify.OdooId);
            await setOdooFreightNumberAndPosInFreight(ids, elementToModify.Freight, elementToModify.PosInFreight);
        }

        await visualizeFreights();

        var nmbrBox = freightNumberBox.dxNumberBox("instance");
        nmbrBox.off('onValueChanged');
        nmbrBox.option('value', freightNumber);
        nmbrBox.on('onValueChanged', selectFreightElements);
    },
});

$('#btnDeleteFreightDivId').dxButton({
    icon: 'trash',
    onClick: async function (data) {
        //-- prevent automatic coloring from mixing with freight colors
        modelIsColored = false; 
        //get alle elements with current freight number
        var freightNumber = freightNumberBox.dxNumberBox("instance").option("value");
        var elementsToModify = await getElementsInFreight(freightNumber);
        //remove freight info of the elements that are in this freight atm (set as 0)
        var ids = elementsToModify.map(x => x.OdooId);
        await setOdooFreightNumberAndPosInFreight(ids, 0, 0);

        await visualizeFreights();
    },
});

$('#btnDeleteAllFreightsDivId').dxButton({
    text: 'Verwijdere alle',
    onClick: async function (data) {
        //-- prevent automatic coloring from mixing with freight colors
        modelIsColored = false; 
        //get alle elements with a freight number
        var elementsToModify = await getElementsInFreight(undefined);
        //remove freight info of the elements that are in this freight atm (set as 0)
        var ids = elementsToModify.map(x => x.OdooId);
        await setOdooFreightNumberAndPosInFreight(ids, 0, 0);

        await visualizeFreights();
    },
});

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

            var projectInfo;
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "project.project",
                    domain: '[["id", "=", "' + id + '"]]',
                    fields: '["id", "partner_id", "site_address_id"]',
                },
                success: function (data) {
                    //console.log('succes: ');
                    //console.log(data);
                    projectInfo = { id: data[0].id, partner_id: data[0].partner_id[0], site_address_id: data[0].site_address_id[0] };
                }
            });

            //console.log('project: ');
            //console.log(project);

            //console.log("projectId: " + id);
            //console.log(selectedObjects);
            var deliverySlipId = -1;
            await $.ajax({
                type: "POST",
                url: odooURL + "/api/v1/create",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "vpb.delivery.slip",
                    values: '{"project_id": ' + projectInfo.id
                        + ', "partner_id": ' + projectInfo.partner_id
                        + ', "delivery_location_id": ' + projectInfo.site_address_id
                        + '}',
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
            for (var selectedObject of listObjects) {
                if (selectedObject.OdooPmmId == -1 || selectedObject.OdooTcmId == -1 || !selectedObject.ValidForNewSlip)
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
                        console.log("Assembly " + guidToChange + " added as " + objStatus.Status);

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

            //var snapshot = await API.viewer.getSnapshot();
            //console.log(snapshot);

            await API.viewer.setSelection(undefined, 'remove');
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
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
        //qsdfqsdf
        data.component.option('text', getTextById("btnGetOdooInfo"));
        buttonIndicator.option('visible', true);
        try {
            await checkAssemblySelection();
            checkUsernameAndPassword();

            const selection = await API.viewer.getSelection();
            const selector = {
                modelObjectIds: selection
            };
            const mobjectsArr = await API.viewer.getObjects(selector);
            var selectedGuidsPerModelId = [];
            var selectedGuids = [];
            for (const mobjects of mobjectsArr.filter(x => x.objects.length > 0)) {
                const objectRuntimeIds = mobjects.objects.map(o => o.id); //o.id = runtimeId = number
                const objectIds = await API.viewer.convertToObjectIds(mobjects.modelId, objectRuntimeIds);//objectIds = compressed ifc ids
                //console.log(objectRuntimeIds);
                var guids = objectIds.map(x => Guid.fromCompressedToFull(x));
                selectedGuidsPerModelId.push({ modelId: mobjects.modelId, Guids: guids });
                selectedGuids.push(...guids);
            }

            if (selectedGuids.length == 0)
                throw getTextById("errorMsgNothingSelected");

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
                domainTrimbleConnectMain = '[["project_id", "=", ' + projectId + '],' + domainTrimbleConnectMain + "]";
                //console.log("domainTrimbleConnectMain");
                //console.log(domainTrimbleConnectMain);
                var domainProjectMarks = "";
                var recordsAdded = 0;
                var cntr = 0;
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/v1/search_read",
                    headers: { "Authorization": "Bearer " + token },
                    data: {
                        model: "trimble.connect.main",
                        domain: domainTrimbleConnectMain,
                        fields: `["id", "name", "mark_id", "rank", "date_drawn", "date_fab_planned", "date_fab_start", "date_fab_end", "date_fab_dem", 
                            "date_transported", "date_erected", "mark_available", "location_bin", "freight", "unit_id", "mark_location_id"]`,
                    },
                    success: function (odooData) {
                        //console.log("trimble.connect.main");
                        //console.log(odooData);
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
                                    PlanningType: "TrimbleConnect",
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
                                    DateErected: record.date_erected ? getDateShortString(getDateFromString(record.date_erected)) : "",
                                    AvailableForTransport: record.mark_available,
                                    Bin: record.location_bin ? record.location_bin[1] : "/",
                                    Freight: record.freight == -1 ? '/' : record.freight,
                                    Unit: record.unit_id ? record.unit_id[1] : "/",
                                    Mass: 0,
                                    PosNmbr: 0,
                                    Prefix: "",
                                    AssemblyName: "",
                                    Length: 0,
                                    Volume: 0,
                                    Profile: "",
                                    CableLength: "",
                                    Finish: "",
                                    Material: "",
                                    Location: record.mark_location_id ? record.mark_location_id[1] : "/",
                                });
                            cntr++;
                            recordsAdded++;
                        }
                    }
                });

                //If there are selected assemblies that weren't found in the planning db
                if (selectedAssemblies.length < selectedGuids.length) {
                    //Get GUID's that weren't found in trimble.connect.main
                    //Get their MERKNUMMER and PREFIX
                    var unknownSelectedAssemblyPositions = [];
                    var processedGuids = new Set(selectedAssemblies.map(o => o.Guid));
                    for (const guidsPerModelId of selectedGuidsPerModelId) {
                        var unprocessedGuids = guidsPerModelId.Guids.filter(x => !processedGuids.has(x));
                        if (unprocessedGuids.length == 0) continue;
                        var unprocessedCompressedIfcIds = unprocessedGuids.map(x => Guid.fromFullToCompressed(x)); //objectIds = compressed ifc ids
                        var runtimeIds = await API.viewer.convertToObjectRuntimeIds(guidsPerModelId.modelId, unprocessedCompressedIfcIds);
                        var objPropertiesArr = await API.viewer.getObjectProperties(guidsPerModelId.modelId, runtimeIds);
                        for (const objproperties of objPropertiesArr) {
                            var defaultProperties = objproperties.properties.find(p => p.name === "Default");
                            if (defaultProperties == undefined)
                                continue;
                            var prefixProperty = defaultProperties.properties.find(x => x.name === "MERKPREFIX");
                            var assemblyPosProperty = defaultProperties.properties.find(x => x.name === "MERKNUMMER");
                            var guidProperty = defaultProperties.properties.find(x => x.name === "GUID");
                            if (prefixProperty == undefined || assemblyPosProperty == undefined || guidProperty == undefined)
                                continue;
                            unknownSelectedAssemblyPositions.push({
                                Prefix: prefixProperty.value,
                                AssemblyPos: assemblyPosProperty.value,
                                Guid: guidProperty.value,
                            });
                        }
                    }
                    //Check if PREFIX is a steel prefix
                    var steelPrefixes = prefixDetails.filter(x => x.MaterialType === "staal").map(x => x.name);
                    var regex = new RegExp(steelPrefixes.join("|"), "i"); //regex instead of includes, includes is case sensitive, this regex is not
                    var steelAssemblies = unknownSelectedAssemblyPositions.filter(a => regex.test(a.Prefix));
                    //If GUID is a steel assembly => get info from steel info tables

                    if (steelAssemblies.length > 0) {
                        for (var steelAssembly of steelAssemblies) {
                            var selectedAssembly = {};
                            await $.ajax({
                                type: "GET",
                                url: odooURL + "/api/v1/search_read",
                                headers: { "Authorization": "Bearer " + token },
                                data: {
                                    model: "project.master_marks",
                                    domain: '[["project_id", "=", ' + projectId + '],["mark_ref", "=", "' + steelAssembly.AssemblyPos + '"]]',
                                    fields: '["id", "name", "create_date"]',
                                },
                                success: function (odooData) {
                                    //console.log("project.master_marks");
                                    //console.log(odooData);
                                    if (odooData.length > 0) {
                                        var record = odooData[0];
                                        selectedAssembly.OdooPmmId = record.id;
                                        selectedAssembly.OdooCode = record.name;
                                        selectedAssembly.Guid = steelAssembly.Guid;
                                        selectedAssembly.DateDrawn = record.create_date ? getDateShortString(getDateFromString(record.create_date)) : "";
                                        selectedAssembly.Rank = "x";
                                        selectedAssembly.PlanningType = "Steel";
                                        selectedAssembly.SteelPacks = [];
                                    }
                                }
                            });

                            var filterArrStr = '["id", "=", "' + selectedAssembly.OdooPmmId + '"]';
                            if (cntr > 0) {
                                domainProjectMarks = '"|", ' + filterArrStr + ',' + domainProjectMarks;
                            }
                            else {
                                domainProjectMarks = filterArrStr;
                            }
                            await $.ajax({
                                type: "GET",
                                url: odooURL + "/api/v1/search_read",
                                headers: { "Authorization": "Bearer " + token },
                                data: {
                                    model: "project.mark_steel_pack",
                                    domain: '[["mark_ids.mark_id.id", "=", "' + selectedAssembly.OdooPmmId + '"]]',
                                    fields: '["id", "mark_ids", "date_ready", "date_done", "location", "name"]', //mark_id = pack item id
                                },
                                success: function (odooData) {
                                    for (var record of odooData) {
                                        var steelPack = {
                                            OdooId: record.id,
                                            Location: record.location ? record.location : "/",
                                            Name: record.name,
                                            ShortName: parseInt(record.name.split('/')[1]),
                                        };
                                        steelPack.DateReady = record.date_ready ? getDateShortString(getDateFromString(record.date_ready)) : "";//==date available
                                        steelPack.DateDone = record.date_done ? getDateShortString(getDateFromString(record.date_done)) : "";//==date transported
                                        selectedAssembly.SteelPacks.push(steelPack);
                                    }   
                                }
                            });

                            selectedAssemblies.push(selectedAssembly);
                            recordsAdded++;
                        }  
                    }
                }

                if (recordsAdded > 0) {
                    //don't think project_id would make this query faster since it's an exact id is given
                    domainProjectMarks = "[" + domainProjectMarks + "]";
                    //console.log("domainProjectMarks");
                    //console.log(domainProjectMarks);
                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "project.master_marks",
                            domain: domainProjectMarks,
                            fields: '["id", "mark_mass", "mark_ranking", "mark_prefix", "mark_length", "mark_volume", "mark_profile", "mark_comment", "mark_material"]',
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
                                    object.Finish = record.mark_comment;
                                    object.Material = record.mark_material;
                                    object.Drawings = [];
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
                                    object.Drawings.push({ Type: record.type, Url: getOdooDrawingUrl(projectNumber, record.name_system)});
                                }
                            }
                        }
                    });
                }
            }

            if (selectedAssemblies.length == 0) {
                throw getTextById("textNoInfoFound");
            }
            else {
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
                    height: 660
                });
                popup.show();
            }
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
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
            if (searchStr.trim() === "") throw getTextById("errorMsgEmptySearchstring"); 
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
                else if (q.Prefix === "WD")
                {
                    qStr = '"&",["mark_id.mark_prefix", "=", "W"],["mark_id.mark_profile", "ilike", "_' + q.StartPos + '_"]';
                }
                else if (q.Prefix.startsWith("WW")) {
                    qStr = '"&",["mark_id.mark_prefix", "=", "W"],["mark_id.mark_reinf_type", "=ilike", "' + q.Prefix.substring(2) + '"]';
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
            domainStr = '[["project_id", "=", ' + projectId + '],' + domainStr + ']';

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

            //console.log(domainStr);

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
            //console.log(assembliesToSelect);
            var steelPrefixes = prefixDetails.filter(x => x.MaterialType === "staal").map(x => x.name);
            var regex = new RegExp(steelPrefixes.join("|"), "i"); //regex instead of includes, includes is case sensitive, this regex is not
            var queryGroupsSteel = queryGroups.find(g => regex.test(g.Prefix));
            if (assembliesToSelect.length > 0) {
                if (queryGroupsSteel != undefined) {
                    DevExpress.ui.notify(getTextById("errorSearchStringContainsSteel"), "info", 5000);
                }

                var guidsToSelect = assembliesToSelect.map(a => a.Guid);
                //console.log(guidsToSelect);
                await selectGuids(guidsToSelect);
            }
            else {
                var text = getTextById("errorNoResultForSearchstring");
                if (queryGroupsSteel != undefined) {
                    text += " " + getTextById("errorSearchStringContainsSteel");
                }
                throw text;
            }

            var selectArrows = checkBoxDirectionArrows.dxCheckBox("instance").option("value");
            if (Boolean(selectArrows)) {
                await selectDirectionArrows();
            }
            //select assemblies
            //inform if certain elements weren't found
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 10000);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnOdooSearch"));
    },
});

$("#btnTest").dxButton({
    stylingMode: "outlined",
    text: "Test",
    type: "success",
    onClick: async function (data) {
        var qsdf = await captureScreenshot();
        console.log(Guid.fromCompressedToFull('33sq37qxr6YgHI8s0UQ3CM'));
    },
});

const captureScreenshot = async () => {
    try {
        const canvas = document.createElement("canvas");
        const screenshot = new Image();
        var options = { preferCurrentTab: true, video:true };
        const captureStream = await navigator.mediaDevices.getDisplayMedia(options);
        var track = captureStream.getVideoTracks()[0];
        let imageCapture = new ImageCapture(track);
        var imgBm = await imageCapture.grabFrame();
        screenshot.srcObject = captureStream.getVideoTracks()[0];
        canvas.width = imgBm.width;
        canvas.height = imgBm.height;
        canvas.getContext("2d").drawImage(imgBm, 0, 0, imgBm.width, imgBm.height);
        const frame = canvas.toDataURL("image/png");
        console.log(frame);
        //window.location.href = frame;;
        captureStream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error("Error: " + err);
    }
};

$("#btnVisualizeTTDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizeTTText"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        var standardTTWidth = 2400;
        await colorNonStandardWidth('TT', standardTTWidth);
        var legendItems = [
            { Text: `${getTextById(TTWidth)} = ${standardTTWidth}`, Color: { r: 0, g: 255, b: 0 } },
            { Text: `${getTextById(TTWidth)} < ${standardTTWidth}`, Color: { r: 255, g: 0, b: 0 } },
        ];

        var standardTTTWidth = 1800;
        await colorNonStandardWidth('TTT', 1800, false);
        legendItems.push({ Text: `${getTextById(TTTWidth)} = ${standardTTTWidth}`, Color: { r: 0, g: 255, b: 0 } });
        legendItems.push({ Text: `${getTextById(TTTWidth)} < ${standardTTTWidth}`, Color: { r: 255, g: 0, b: 0 } });

        await showDirectionArrows();

        popup.option({
            contentTemplate: () => popupContentTemplateLegend(legendItems),
            height: 100 + legendItems.length * 30
        });
        popup.show();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizeTTText"));
    },
});

$("#btnVisualizeWWidthDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizeWWidthText"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        var standardWWidth = 1200;
        await colorNonStandardWidth('W', standardWWidth);
        var legendItems = [
            { Text: `${getTextById(WWidth)} = ${standardWWidth}`, Color: { r: 0, g: 255, b: 0 } },
            { Text: `${getTextById(WWidth)} < ${standardWWidth}`, Color: { r: 255, g: 0, b: 0 } },
        ];

        await showDirectionArrows();

        popup.option({
            contentTemplate: () => popupContentTemplateLegend(legendItems),
            height: 100 + legendItems.length * 30
        });
        popup.show();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizeWWidthText"));
    },
});

$("#btnVisualizeWProfileDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizeWProfile"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        await colorWByProfile();

        await showDirectionArrows();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizeWProfile"));
    },
});

$("#btnVisualizeWReinforcementDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizeWReinforcement"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeGeneral"));
        buttonIndicator.option('visible', true);

        await colorWByReinforcement();

        await showDirectionArrows();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizeWReinforcement"));
    },
});

async function colorNonStandardWidth(prefix, standardWidth, hideRest = true) {
    if (hideRest) {
        var allObjects = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
        for (const mobjects of allObjects) {
            var modelId = mobjects.modelId;
            const objectsRuntimeIds = mobjects.objects.map(o => o.id);
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });
        }
    }

    const objectsW = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': prefix } } });
    for (const mobjects of objectsW) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        if (objectsRuntimeIds.length == 0)
            continue;
        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: { r: 0, g: 255, b: 0 }, visible: true });
    }

    const objectsWStandard = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': prefix, 'Default.WIDTH': standardWidth } } });
    for (const mobjects of objectsWStandard) {
        var modelId = mobjects.modelId;
        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
        if (objectsRuntimeIds.length == 0)
            continue;
        const objectPropertiesArr = await API.viewer.getObjectProperties(modelId, objectsRuntimeIds);
        var objectsRuntimeIdsToColor = [];
        for (const objproperties of objectPropertiesArr) {
            var width = objproperties.properties.flatMap(p => p.properties).find(p => p.name === "WIDTH");
            if (width != undefined && (Math.round((width.value + Number.EPSILON) * 100) / 100) != standardWidth) {
                objectsRuntimeIdsToColor.push(objproperties.id);
            }
        }
        //console.log(objectsRuntimeIdsToColor);
        if (objectsRuntimeIdsToColor.length > 0)
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIdsToColor }] }, { color: { r: 255, g: 0, b: 0 }, visible: true });
    }
}

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
            DevExpress.ui.notify(e, "info", 5000);
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
        document.getElementById("trLegendErected").style.backgroundColor = getColorString(objectStatuses.find(o => o.Status === StatusErected).Color);
        await setAccesBooleans();
        document.getElementById("transportDiv").style.display = hasAccesToTransportUi ? 'block' : 'none';
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
                referenceDate = new Date(datePicker.dxDateBox("instance").option("value"));
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
                            domain: '["&",["trimble_connect_id.project_id", "=", ' + id + '],"&",["id", ">", "' + lastId + '"],"|",["slip_id.state", "=", "draft"],"|",["slip_id.state", "=", "released"],"|",["slip_id.state", "=", "handling"],["slip_id.state", "=", "loaded"]]',
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
                        domain: '[["project_id", "=", ' + id + '],["id", ">", "' + lastId + '"],["state","!=","cancelled"]]',
                        fields: '["id", "mark_id", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "date_erected", "state", "mark_available"]',
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
                            if (record.mark_id[0] != undefined) {
                                processedAssemblyIds.push(record.mark_id[0]);
                            }
                        }
                    }
                });
            }
            //console.log("Finished: Getting concrete assembly info");

            

            //--Get steel assembly info
            //Assume that assemblies, which haven't been added to the trimble.connect.main table, are steel assemblies 
            //=> get all assemblies from project.master_marks
            //and filter out those that have been added to the trimble.connect.main table
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
                        domain: '[["project_id", "=", ' + id + '],["id", ">", "' + lastId + '"]]',
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
            //console.log(unprocessedAssemblies);
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
                        domain: '[["project_id", "=", ' + id + '],["id", ">", "' + lastId + '"]]',
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
                        domain: '[["project_id", "=", ' + id + '],["id", ">", "' + lastId + '"]]',
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
                                    PackItemIds: record.mark_ids,
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
                        fields: '["id", "mark_id", "qty", "upper_id"]', //mark_id = odoo assembly id
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
                                    PackId: record.upper_id[0],
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
                const itemsInPack = steelPackItems.filter(x => x.PackId == steelPack.OdooId);
                //console.log(itemsInPack);
                //console.log("itemsInPack");
                for (const item of itemsInPack) {
                    //console.log("item");
                    //console.log(item);
                    for (var i = 0; i < item.Quantity; i++) {
                        var unprocessedAssembly = unprocessedAssemblies.find(x => x.AssemblyId == item.AssemblyId && x.Status === StatusProductionEnded);
                        //console.log("unprocessedAssembly");
                        //console.log(unprocessedAssembly);
                        if (unprocessedAssembly != undefined) {
                            if (steelPack.DateDone <= referenceDate)
                                unprocessedAssembly.Status = StatusTransported;
                            else if (steelPack.DateReady <= referenceDate)
                                unprocessedAssembly.Status = StatusAvailableForTransport;
                        }
                    }
                }
            }
            //console.log(unprocessedAssemblies);
            //console.log("Finished: Processing steel pack info");

            //console.log("Odoo part finished");

            //console.log("Getting IFCELEMENTASSEMBLY start");
            const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
            //console.log("Getting IFCELEMENTASSEMBLY end");

            //runtimeIds = [17062, 17065, ...] = ids used by viewer
            //objectIds = compressed IFC guids = ['28DCGNPlH98vcQNyNhB4sQ', '0fKOmd_6PFgOiexu4H1vtU', ...] = can be used to map runtimeId to original IFC

            //find objects by assemblypos and add to status objects
            //console.log("find objects by assemblypos and add to status objects start");
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
                        for (var i = 0; i < tempObjects.ObjectRuntimeIds.length; i += sliceLength) {
                            var slicedObjectRuntimeIds = tempObjects.ObjectRuntimeIds.slice(i, i + sliceLength);
                            const tempObjectsIfcIds = await API.viewer.convertToObjectIds(modelId, slicedObjectRuntimeIds);
                            var objectStatus = objectStatuses.find(o => o.Status === tempObjects.Status);
                            objectStatus.Guids = objectStatus.Guids.concat(tempObjectsIfcIds.map(c => Guid.fromCompressedToFull(c)));
                            objectStatus.CompressedIfcGuids = objectStatus.CompressedIfcGuids.concat(tempObjectsIfcIds);
                        }
                    }
                }
            }
            //console.log("find objects by assemblypos and add to status objects end");

            //console.log("set colors start");
            var objectStatusModelled = objectStatuses.find(o => o.Status === StatusModelled);
            var unplannedIfcIds = [];
            var compressedIfcGuidsWithKnownStatus = [];
            for (const objStatus of objectStatuses) {
                compressedIfcGuidsWithKnownStatus = compressedIfcGuidsWithKnownStatus.concat(objStatus.CompressedIfcGuids);
            }
            var compressedIfcGuidsWithKnownStatusSet = new Set(compressedIfcGuidsWithKnownStatus);
            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                for (var i = 0; i < objectsRuntimeIds.length; i += sliceLength) {
                    var objectsRuntimeIdsSliced = objectsRuntimeIds.slice(i, i + sliceLength);
                    const objectsIfcIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIdsSliced);
                    unplannedIfcIds = unplannedIfcIds.concat(objectsIfcIds.filter(x => !compressedIfcGuidsWithKnownStatusSet.has(x)));
                }
                for (const objStatus of objectStatuses) {
                    var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, objStatus.CompressedIfcGuids);
                    for (var i = 0; i < runtimeIds.length; i += sliceLength) {
                        var runtimeIdsSliced = runtimeIds.slice(i, i + sliceLength);
                        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsSliced }] }, { color: objStatus.Color });
                    }
                }
            }
            //console.log("set colors end");

            //console.log("process prefix BESTAAND start");
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
            //console.log("process prefix BESTAAND end");

            //console.log("process modelled assemblies start");
            for (const mobjects of mobjectsArr) {
                var modelId = mobjects.modelId;
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                //get overlapping runtimeIds of both collections
                var runtimeIdsModelled = await API.viewer.convertToObjectRuntimeIds(modelId, objectStatusModelled.CompressedIfcGuids);
                const filteredRuntimeIds = objectsRuntimeIds.filter(i => runtimeIdsModelled.includes(i));

                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: filteredRuntimeIds }] }, { color: objectStatusModelled.Color });
            }
            //console.log("process modelled assemblies end");

            modelIsColored = true;
        }
        catch (e) {
            console.log(e);
            DevExpress.ui.notify(e, "info", 5000);
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

        var selectedItem = labelContentOdooSelectBox.dxSelectBox("instance").option("selectedItem");

        var onlyOnVisibleItems = checkBoxOdooLabelsOnlyVisible.dxCheckBox("instance").option("value");
        await AddOdooInfoLabels(selectedItem, onlyOnVisibleItems);

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnSetOdooLabels"));
    },
});

function checkUsernameAndPassword() {
    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    var password = odooPasswordTextbox.dxTextBox("instance").option("value");
    if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
        console.log("no username and/or password found");
        throw getTextById("errorMsgUsernamePassword");
    }
}

async function AddOdooInfoLabels(selectedItem, onlyOnVisibleItems) {
    try {
        await checkAssemblySelection();

        var possibleSelectBoxValues = getLabelContentOdooTypes();

        let jsonArray = "[";
        const selection = await API.viewer.getSelection();
        const selector = {
            modelObjectIds: selection
        };
        const modelspecs = await API.viewer.getModels("loaded");
        var mobjectsArr = [];
        if(onlyOnVisibleItems)
        {
            var mobjectsArrSelected = await API.viewer.getObjects(selector);
            var mobjectsArrVisible = await API.viewer.getObjects(undefined, {visible: true});
            for(var arr of mobjectsArrSelected)
            {
                var visibleArr = mobjectsArrVisible.find(a => a.modelId === arr.modelId);
                if(visibleArr == undefined)
                    continue;
                arr.objects = arr.objects.filter(o => visibleArr.objects.find(vo => vo.id == o.id));
                if(arr.objects.length > 0)
                    mobjectsArr.push(arr);
            }
        }
        else
        {
            mobjectsArr = await API.viewer.getObjects(selector);
        }
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
            var assemblyInfo = await getAssemblyInfoByCompressedGuids(objectIds);
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
                var assemblyInfoObj = assemblyInfo.find(x => x.Guid.toUpperCase() === guid.value.toUpperCase());
                if (selectedItem === possibleSelectBoxValues[0]) {
                    if (assemblyInfoObj != undefined) {
                        if (assemblyInfoObj.AssemblyQuantity > 1)
                            color = { r: 255, g: 0, b: 0, a: 255 };
                        labelText = assemblyInfoObj.AssemblyName;
                    }
                    else
                        continue;
                }
                else if (selectedItem === possibleSelectBoxValues[1]) {
                    if (assemblyInfoObj != undefined) {
                        labelText = `${assemblyInfoObj.AssemblyName}_${assemblyInfoObj.FreightInfo}`;
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
            DevExpress.ui.notify(getTextById("errorMsgNoOdooAssembliesFound"), "info", 5000);
        }
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
        console.log(e);
    }
}

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
            DevExpress.ui.notify(e, "info", 5000);
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
        await showDirectionArrows();
    }
});

$("#btnSelectArrowsDivId").dxButton({
    stylingMode: "outlined",
    text: "Selecteer montagepijlen",
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        await setObjectSelectionByPropnameAndValue("Default.COMMENT", "MONTAGEPIJL");
    }
});

async function showDirectionArrows() {
    try {
        //Show Arrows
        const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Default.COMMENT", "MONTAGEPIJL"));
        //console.log(mobjectsArrPijlen);
        if (mobjectsArrPijlen.length && mobjectsArrPijlen.length > 0) {
            for (var mobjects of mobjectsArrPijlen) {
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: true });
            }
        }

        //Show Grid
        //maybe try with setLayersVisibility
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }
}

async function selectDirectionArrows() {
    try {
        //Select Arrows
        const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Default.COMMENT", "MONTAGEPIJL"));
        if (mobjectsArrPijlen.length && mobjectsArrPijlen.length > 0) {
            for (var mobjects of mobjectsArrPijlen) {
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                await API.viewer.setSelection({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, 'add');
            }
        }

        //Select Grid
        const mobjectsArrGrids = await API.viewer.getObjects({ parameter: { class: "IFCGRID" } });
        if (mobjectsArrGrids.length && mobjectsArrGrids.length > 0) {
            for (var mobjects of mobjectsArrGrids) {
                const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                const objectPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsRuntimeIds);
                var objectsRuntimeIdsGrid0 = [];
                for (const objproperties of objectPropertiesArr) {
                    var productName = objproperties.product.name
                    if (productName === "0.0")
                        objectsRuntimeIdsGrid0.push(objproperties.id);
                }
                if (objectsRuntimeIdsGrid0.length > 0) {
                    await API.viewer.setSelection({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIdsGrid0 }] }, 'add');
                }
            }
        }
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }
}

//$("#btnShowBoltsDivId").dxButton({
//    stylingMode: "outlined",
//    text: "Show Bolts",
//    type: "success",
//    template(data, container) {
//        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
//        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
//            visible: false,
//        }).dxLoadIndicator('instance');
//    },
//    onClick: async function (data) {
//        try {
//            const mobjectsArrBolts = await API.viewer.getObjects({ parameter: { class: "IFCMECHANICALFASTENER" } });
//            if (mobjectsArrBolts.length != undefined && mobjectsArrBolts.length > 0) {
//                for (var mobjects of mobjectsArrBolts) {
//                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
//                    console.log(objectsRuntimeIds);
//                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: true });
//                    var selector = { modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] };
//                    await API.viewer.setSelection(selector, "add");
//                }
//            }
//        }
//        catch (e) {
//            console.log(e);
//            DevExpress.ui.notify(e, "info", 5000);
//        }
//    },
//});


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
                await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false, color: { a: 255 } });
                if (idsPerPrefixPerModelId.find(o => o.ModelId === modelId) !== undefined) {
                    continue;
                }
                var idsPerPrefix = [];
                for (var i = 0; i < objectsRuntimeIds.length; i += sliceLength) {
                    var objectsRuntimeIdsSliced = objectsRuntimeIds.slice(i, i + sliceLength);
                    const objectPropertiesArr = await API.viewer.getObjectProperties(modelId, objectsRuntimeIdsSliced);
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
                        if (!prefixes.includes(propPrefix.value)) continue;
                        var prefixArr = idsPerPrefix.find(p => p.Prefix === propPrefix.value);
                        if (prefixArr !== undefined) {
                            prefixArr.ObjectRuntimeIds.push(objproperties.id);
                        }
                        else {
                            idsPerPrefix.push(
                                {
                                    Prefix: propPrefix.value,
                                    ObjectRuntimeIds: [objproperties.id]
                                }
                            );
                        }
                    }
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

            //Hide dummy objects but keep external prestressed beams visible
            var arraysToHide = [];
            await API.viewer
                .getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "IfcMaterial.Material": "XXX*" } } })
                .then((value) => {arraysToHide.push(value)});
            //arraysToHide.push(await API.viewer.getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "IfcMaterial.Material": "XXX*" } } }));
            await API.viewer
                .getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "Default.MERKPREFIX": "XXX" } } })
                .then((value) => {arraysToHide.push(value)});
            //arraysToHide.push(await API.viewer.getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "Default.MERKPREFIX": "XXX" } } }));
            await API.viewer
                .getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "Default.MERKPREFIX": "BEWERKING" } } })
                .then((value) => {arraysToHide.push(value)});
            //arraysToHide.push(await API.viewer.getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "Default.MERKPREFIX": "BEWERKING" } } }));
            await API.viewer
                .getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "Default.ONDERDEELPREFIX": "W_DRUKLAAG" } } })
                .then((value) => {arraysToHide.push(value)});
            //arraysToHide.push(await API.viewer.getObjects({ class: "IFCBUILDINGELEMENTPART", parameter: { properties: { "Default.ONDERDEELPREFIX": "W_DRUKLAAG" } } }));
            for (var arrayToHide of arraysToHide) {
                for (const mobjects of arrayToHide) {
                    const objectsIds = mobjects.objects.map(o => o.id);
                    //const objectPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
                    //console.log(objectPropertiesArr);
                    var objectIdsToHide = [];
                    await API.viewer
                        .getObjectProperties(mobjects.modelId, objectsIds)
                        .then((objectPropertiesArr) => {
                            for (const objproperties of objectPropertiesArr) {
                                if (!objproperties.product.description || !objproperties.product.description.startsWith("EX")) {
                                    objectIdsToHide.push(objproperties.id);
                                }
                            }
                    });
                    if (objectIdsToHide.length > 0) {
                        await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectIdsToHide }] }, { visible: false });
                    }
                }
            }

            //Show Arrows
            try
            {
                const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Default.COMMENT", "MONTAGEPIJL"));
                //console.log(mobjectsArrPijlen);
                if (mobjectsArrPijlen.length != undefined && mobjectsArrPijlen.length > 0) {
                    for (var mobjects of mobjectsArrPijlen) {
                        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                        await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: true });
                    }
                }
            }
            catch
            {
                
            }

            //Show Bolts - Wether or not bolts are shown depends on the visibility of the parent part.
            //So if the parent part is hidden, the code below will not make the bolt appear.
            try
            {
                const mobjectsArrBolts = await API.viewer.getObjects({ parameter: { class: "IFCMECHANICALFASTENER" } });
                if (mobjectsArrBolts.length != undefined && mobjectsArrBolts.length > 0) {
                    for (var mobjects of mobjectsArrBolts) {
                        const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                        await API.viewer.setObjectState({ modelObjectIds: [{ modelId: mobjects.modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: true });
                    }
                }
            }
            catch
            {

            }
        }
        catch (e) {
            console.log((new Date()).toTimeString() + ": " + e);
            DevExpress.ui.notify(e, "info", 5000);
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
            var onlyOnVisibleItems = checkBoxBasicLabelsOnlyVisible.dxCheckBox("instance").option("value");
            await addTextMarkups(onlyOnVisibleItems);
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
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
        document.getElementById("divTitleAction6").style.display = displayValue;
        document.getElementById("divTitleProduction").style.display = displayValue;
        titlesShown = !titlesShown;
        data.component.option('text', titlesShown ? getTextById("btnHideTitles") : getTextById("btnShowTitles"));
    },
});

$("#btnVisualizeFreightsDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnShowFreights"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnShowFreightsVisualizing"));
        buttonIndicator.option('visible', true);

        await visualizeFreights();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnShowFreights"));
    },
});

$("#btnVisualizeConcreteFinishDivId").dxButton({
    stylingMode: "outlined",
    text: getTextById("btnVisualizeConcreteFinish"),
    type: "success",
    template(data, container) {
        $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
        buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
            visible: false,
        }).dxLoadIndicator('instance');
    },
    onClick: async function (data) {
        data.component.option('text', getTextById("btnVisualizeConcreteFinishVisualizing"));
        buttonIndicator.option('visible', true);

        await visualizeConcreteFinishes();

        buttonIndicator.option('visible', false);
        data.component.option('text', getTextById("btnVisualizeConcreteFinish"));
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
            //console.log("start");

            //Show Grids
            const mobjectsArrGrids = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Presentation Layers.Layer", "Grid 0.0"));
            //console.log("mobjectsArrGrids.length: " + mobjectsArrGrids.length);
            //console.log("mobjectsArrGrids[0].objects.length: " + mobjectsArrGrids[0].objects.length);
            if (mobjectsArrGrids.length > 0) {
                await API.viewer.setObjectState(mobjectsArrGrids, true);
            }

            //Show Arrows
            const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Tekla Common.Finish", "MONTAGE"));
            //console.log("mobjectsArrPijlen.length: " + mobjectsArrPijlen.length);
            //console.log("mobjectsArrPijlen[0].objects.length: " + mobjectsArrPijlen[0].objects.length);
            if (mobjectsArrGrids.length > 0) {
                await API.viewer.setObjectState(mobjectsArrPijlen, true);
            }

            //await API.viewer.setSelection(mobjectsArrGrids, "add");
            //await API.viewer.setSelection(mobjectsArrPijlen, "add");

            //console.log("end");
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
        }
        buttonIndicator.option('visible', false);
        data.component.option('text', "Toon stramien en montagepijlen");
    },
});

$("#btnReversePosInFreightDivId").dxButton({
    icon: 'sorted',
    onClick: async function (data) {
        try {
            listObjects.reverse();
            setPosInFreight();
            dataGridProduction.dxDataGrid("refresh");
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
        }
    },
});

$("#btnLabelPosInFreightDivId").dxButton({
    icon: 'tags',
    onClick: async function (data) {
        try {
            var possibleSelectBoxValues = getLabelContentOdooTypes();
            await AddOdooInfoLabels(possibleSelectBoxValues[1]);
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
        }
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

//Erected
$("#btnShowErected").dxButton({
    icon: 'images/eye.png',
    stylingMode: "text",
    type: "back",
    hint: "show these",
    onClick: async function (data) {
        await setVisibility(StatusErected, true);
    },
});

$("#btnHideErected").dxButton({
    icon: 'images/eyeCrossed.png',
    stylingMode: "text",
    type: "back",
    hint: "hide these",
    onClick: async function (data) {
        await setVisibility(StatusErected, false);
    },
});

$("#btnOnlyShowErected").dxButton({
    icon: 'images/showAll.png',
    stylingMode: "text",
    type: "back",
    hint: "only show these",
    onClick: async function (data) {
        await onlyShowStatus(StatusErected);
    },
});
//#endregion

//#endregion

var dataGridMontage = $("#dataGridTransport").dxDataGrid({
    dataSource: listObjects,
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
        sortOrder: 'asc',
        width: 120,
        calculateSortValue: function (rowData) {
            return rowData.Prefix.toString().padStart(12, "0") + rowData.PosNmbr.toString().padStart(6, "0") + "." + rowData.Rank.toString().padStart(4, "0");
        },
    }, {
        dataField: 'Weight',
        caption: getTextById("gridTitleWeight"),
        dataType: 'number',
        width: 120,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'Profile',
        caption: 'Profiel',
        dataType: 'number',
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'SlipName',
        caption: 'Bon',
        width: 80,
        cellTemplate(container, options) {
            $(`<a href="${getOdooSlipUrl(options.data.OdooSlipId)}" target="_blank" rel="noopener noreferrer">${options.value}</a>`)
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
        var objectRemoved = listObjects.find(x => x.OdooTcmId == e.key);
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
            e.cellElement.css("color", e.data.ValidForNewSlip ? "white" : "red");
        }
    },
});

var dataGridProduction = $("#dataGridProduction").dxDataGrid({
    dataSource: listObjects,
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
    columns: [
    {
        dataField: 'PosInFreight',
        caption: 'Positie in vracht',
        dataType: 'number',
        width: 100,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'AssemblyName',
        caption: getTextById("gridTitleAssembly"),
        width: 120,
        //sortOrder: 'asc',
        calculateSortValue: function (rowData) {
            return rowData.Prefix.toString().padStart(12, "0") + rowData.PosNmbr.toString().padStart(6, "0") + "." + rowData.Rank.toString().padStart(4, "0");
        },
    }, {
        dataField: 'Weight',
        caption: getTextById("gridTitleWeight"),
        dataType: 'number',
        width: 120,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'ReinforcementType',
        caption: 'Wapeningstype',
        dataType: 'number',
        width: 100,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'Profile',
        caption: 'Profiel',
        dataType: 'number',
        width: 100,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }
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
    rowDragging: {
        allowReordering: true,
        showDragIcons: false,
        onReorder(e) {
            clearDataGridProductionSorting();

            const visibleRows = e.component.getVisibleRows();
            const toIndex = listObjects.findIndex((item) => item.OdooTcmId === visibleRows[e.toIndex].data.OdooTcmId);
            const fromIndex = listObjects.findIndex((item) => item.OdooTcmId === e.itemData.OdooTcmId);

            listObjects.splice(fromIndex, 1);
            listObjects.splice(toIndex, 0, e.itemData);

            setPosInFreight();

            e.component.refresh();
        },
    },
    onRowRemoving: async function (e) {
        var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
        instanceDropDown.reset();
        var objectRemoved = listObjects.find(x => x.OdooTcmId == e.key);
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
            e.cellElement.css("color", e.data.ValidForNewFreight ? "white" : "red");
        }
    },
});

function clearDataGridProductionSorting() {
    var dataGrid = dataGridProduction.dxDataGrid('instance');
    for (var i = 0; i < dataGrid.columnCount(); i++) {
        dataGrid.columnOption(i, 'sortOrder', undefined);
    }
}

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