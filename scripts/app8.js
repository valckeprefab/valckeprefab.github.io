var API = null;
var odooURL = "https://192.168.1.194";
var odooDatabase = "erp_prd"

window.onload = async function () {
    API = await Workspace.connect(window.parent, (event, data) => {
        console.log("Event: ", event, data);

        var eventName = event.split(".").pop();

        if (eventName === "onSelectionChanged") {
            selectionChanged(data.data);
        }
    });
}

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

const filterTypes = [
    'Prefix',
    'Merk',
    'Manueel gebruikersattribuut',
];

var filterTypeSelectBox = $('#filterTypeSelection').dxSelectBox({
    items: filterTypes,
    onValueChanged: function (e) {
        var prefixSelectDiv = document.getElementById("prefixSelectionGrp");
        var assemblyInputDiv = document.getElementById("assemblyInputGrp");
        var manualInputDiv = document.getElementById("manualInputGrp");

        prefixSelectDiv.style.display = "none";
        assemblyInputDiv.style.display = "none";
        manualInputDiv.style.display = "none";

        var selectedItem = e.component.option("selectedItem");
        if (selectedItem === "Prefix") {
            prefixSelectDiv.style.display = "block";
        }
        else if (selectedItem === "Merk") {
            assemblyInputDiv.style.display = "block";
        }
        else if (selectedItem === "Manueel gebruikersattribuut") {
            manualInputDiv.style.display = "block";
        }
    },
});

var odooUsernameTextbox = $('#placeholderOdooUsername').dxTextBox({
    placeholder: 'Vul Odoo gebruikersnaam in, bvb Mattias Hemeryck wordt mhemeryck',
});

var odooPasswordTextbox = $('#placeholderOdooPassword').dxTextBox({
    mode: 'password',
    placeholder: 'Vul Odoo paswoord in',
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

var referenceDatePicker = $('#date').dxDateBox({
    calendarOptions: { firstDayOfWeek: 1 },
    type: 'date',
    label: "dag/maand/jaar",
    displayFormat: 'dd/MM/yyyy',
    value: Date.now(),
});

var colorExisting = { r: 80, g: 56, b: 48 };
var colorModelled = { r: 211, g: 211, b: 211 };
var guidsOnHold = [];
var colorOnHold = { r: 255, g: 0, b: 0 };
var guidsDrawn = [];
var colorDrawn = { r: 221, g: 160, b: 221 };
var guidsPlanned = [];
var colorPlanned = { r: 255, g: 140, b: 0 };
var guidsDemoulded = [];
var colorDemoulded = { r: 128, g: 128, b: 0 };
var guidsProductionEnded = [];
var colorProductionEnded = { r: 255, g: 255, b: 0 };
var guidsAvailableForTransport = [];
var colorAvailableForTransport = { r: 0, g: 128, b: 255 };
var guidsTransported = [];
var colorTransported = { r: 34, g: 177, b: 76 };

function getColorString(color) {
    return "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
}

var token = "";
async function getToken() {
    if (token !== "") {
        var refresh = false;
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/life",
            data: {
                token: token,
            },
            success: function (lifetime) {
                //console.log("Token lifetime: " + lifetime); //lifetime in seconds
                if (lifetime < 60) {
                    refresh = true;
                }
            },
        });

        if (refresh) {
            var refreshSuccesful = false;
            await $.ajax({
                type: "POST",
                url: odooURL + "/api/refresh",
                data: {
                    token: token,
                },
                success: function () {
                    refreshSuccesful = true;
                },
            });
            if (!refreshSuccesful) {
                token = "";
            }
        }
    }

    if (token === "") {
        var username = odooUsernameTextbox.dxTextBox("instance").option("value");
        var password = odooPasswordTextbox.dxTextBox("instance").option("value");
        if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
            console.log("no username and/or password found");
            throw "Gelieve gebruikersnaam en/of paswoord in te vullen.";
        }
        await $.ajax({
            type: "POST",
            url: odooURL + "/api/authenticate",
            data: {
                db: odooDatabase,
                login: username,
                password: password,
            },
            success: function (data) {
                
                token = data.token;
            }
        });
    }
    return token;
}

$(function () {
    $("#setColorFromStatus").dxButton({
        stylingMode: "outlined",
        text: "Kleur elementen volgens planningsstatus",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met inkleuren volgens status');
            buttonIndicator.option('visible', true);
            document.getElementById("legend").style.display = 'block';
            document.getElementById("legendExisting").style.backgroundColor = getColorString(colorExisting);
            document.getElementById("legendModelled").style.backgroundColor = getColorString(colorModelled);
            document.getElementById("legendOnHold").style.backgroundColor = getColorString(colorOnHold);
            document.getElementById("legendDrawn").style.backgroundColor = getColorString(colorDrawn);
            document.getElementById("legendPlanned").style.backgroundColor = getColorString(colorPlanned);
            document.getElementById("legendDemoulded").style.backgroundColor = getColorString(colorDemoulded);
            document.getElementById("legendProductionEnded").style.backgroundColor = getColorString(colorProductionEnded);
            document.getElementById("legendAvailableForTransport").style.backgroundColor = getColorString(colorAvailableForTransport);
            document.getElementById("legendTransported").style.backgroundColor = getColorString(colorTransported);
            try {

                //var debugInfo = "";
                //Get project name
                var regexProjectName = /^[TV]\d+_\w+/;
                var project = await API.project.getProject(); //{ name: "V8597_VDL" };
                //debugInfo = debugInfo.concat("<br />Project name: " + project.name);
                //$(debug).html(debugInfo);
                if (!regexProjectName.test(project.name))
                    return;
                var projectNumber = project.name.split("_")[0];

                //debugInfo = debugInfo.concat("<br />Project number: " + projectNumber);
                //$(debug).html(debugInfo);

                //Authenticate with MUK API
                var token = await getToken();

                //Get project ID
                var id = -1;
                await $.ajax({
                    type: "GET",
                    url: odooURL + "/api/read",
                    data: {
                        token: token,
                        model: "project.project",
                        domain: '[["proj_unique_id", "=", "' + projectNumber + '"]]',
                        fields: '["id", "proj_unique_id"]',
                    },
                    success: function (data) {
                        id = data[0].id;
                    }
                });

                var referenceDate = new Date();
                referenceDate.setHours(23);
                referenceDate.setMinutes(59);
                referenceDate.setSeconds(59);
                var referenceToday = checkBoxToday.dxCheckBox("instance").option("value");
                console.log("referenceToday: " + referenceToday);
                if (!Boolean(referenceToday)) {
                    referenceDate = new Date(referenceDatePicker.dxDateBox("instance").option("value"));
                    console.log("referenceDate: " + referenceDate);
                }
                var ended = 0;
                var lastId = -1;
                guidsOnHold = [];
                guidsDrawn = [];
                guidsPlanned = [];
                guidsDemoulded = [];
                guidsProductionEnded = [];
                guidsAvailableForTransport = [];
                guidsTransported = [];
                while (ended != 1) {
                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/read",
                        data: {
                            token: token,
                            model: "trimble.connect.main",
                            domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"]]',
                            fields: '["id", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "state", "mark_available"]',
                        },
                        success: function (data) {
                            //var i = -1;
                            if (data.length == 0) {
                                ended = 1;
                                return;
                            }
                            for (const record of data) {
                                //i++;
                                lastId = record.id;
                                if (typeof record.state === 'string' && record.state === 'onhold') {
                                    guidsOnHold.push(record.name);
                                }
                                else if (typeof record.date_transported === 'string' && GetDateFromString(record.date_fab_dem) <= referenceDate) {
                                    guidsTransported.push(record.name);
                                }
                                else if (typeof record.date_fab_end === 'string' && GetDateFromString(record.date_fab_end) <= referenceDate) {
                                    if (record.mark_available) {
                                        guidsAvailableForTransport.push(record.name);
                                    }
                                    else {
                                        guidsProductionEnded.push(record.name);
                                    }
                                }
                                else if (typeof record.date_fab_dem === 'string' && GetDateFromString(record.date_fab_dem) <= referenceDate) {
                                    guidsDemoulded.push(record.name);
                                }
                                else if (typeof record.date_fab_planned === 'string' && GetDateFromString(record.date_fab_planned) <= referenceDate) {
                                    guidsPlanned.push(record.name);
                                }
                                else if (typeof record.date_drawn === 'string' && GetDateFromString(record.date_drawn) <= referenceDate) {
                                    guidsDrawn.push(record.name);
                                }
                            }
                            //debugInfo = debugInfo.concat("<br />Records iterated: " + i);
                            //$(debug).html(debugInfo);
                        }
                    });
                }

                console.log("guidsOnHold.length: " + guidsOnHold.length);
                console.log("guidsTransported.length: " + guidsTransported.length);
                console.log("guidsAvailableForTransport.length: " + guidsAvailableForTransport.length);
                console.log("guidsProductionEnded.length: " + guidsProductionEnded.length);
                console.log("guidsDemoulded.length: " + guidsDemoulded.length);
                console.log("guidsPlanned.length: " + guidsPlanned.length);
                console.log("guidsDrawn.length: " + guidsDrawn.length);
                
                var compressedIfcGuidsOnHold = [];
                for (var guidFull of guidsOnHold) {
                    compressedIfcGuidsOnHold.push(Guid.fromFullToCompressed(guidFull));
                }

                var compressedIfcGuidsDrawn = [];
                for (var guidFull of guidsDrawn) {
                    compressedIfcGuidsDrawn.push(Guid.fromFullToCompressed(guidFull));
                }

                var compressedIfcGuidsPlanned = [];
                for (var guidFull of guidsPlanned) {
                    compressedIfcGuidsPlanned.push(Guid.fromFullToCompressed(guidFull));
                }

                var compressedIfcGuidsDemoulded = [];
                for (var guidFull of guidsDemoulded) {
                    compressedIfcGuidsDemoulded.push(Guid.fromFullToCompressed(guidFull));
                }

                var compressedIfcGuidsProductionEnded = [];
                for (var guidFull of guidsProductionEnded) {
                    compressedIfcGuidsProductionEnded.push(Guid.fromFullToCompressed(guidFull));
                }

                var compressedIfcGuidsAvailableForTransport = [];
                for (var guidFull of guidsAvailableForTransport) {
                    compressedIfcGuidsAvailableForTransport.push(Guid.fromFullToCompressed(guidFull));
                }

                var compressedIfcGuidsTransported = [];
                for (var guidFull of guidsTransported) {
                    compressedIfcGuidsTransported.push(Guid.fromFullToCompressed(guidFull));
                }

                const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });

                for (const mobjects of mobjectsArr) {
                    var modelId = mobjects.modelId;
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    const objectsIfcIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);
                    const compressedIfcGuidsOnHoldSet = new Set(compressedIfcGuidsOnHold);
                    const compressedIfcGuidsDrawnSet = new Set(compressedIfcGuidsDrawn);
                    const compressedIfcGuidsPlannedSet = new Set(compressedIfcGuidsPlanned);
                    const compressedIfcGuidsDemouldedSet = new Set(compressedIfcGuidsDemoulded);
                    const compressedIfcGuidsProductionEndedSet = new Set(compressedIfcGuidsProductionEnded);
                    const compressedIfcGuidsAvailableForTransportSet = new Set(compressedIfcGuidsAvailableForTransport);
                    const compressedIfcGuidsTransportedSet = new Set(compressedIfcGuidsTransported);

                    const unplannedIfcIds = objectsIfcIds.filter(x => !compressedIfcGuidsTransportedSet.has(x)
                        && !compressedIfcGuidsAvailableForTransportSet.has(x)
                        && !compressedIfcGuidsProductionEndedSet.has(x)
                        && !compressedIfcGuidsDemouldedSet.has(x)
                        && !compressedIfcGuidsPlannedSet.has(x)
                        && !compressedIfcGuidsDrawnSet.has(x)
                        && !compressedIfcGuidsOnHoldSet.has(x));
                    const unplannedRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, unplannedIfcIds);

                    var onHoldRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsOnHold);
                    var drawnRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsDrawn);
                    var plannedRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsPlanned);
                    var demouldedRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsDemoulded);
                    var productionEndedRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsProductionEnded);
                    var availableForTransportRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsAvailableForTransport);
                    var guidsTransportedRuntimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuidsTransported);

                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: unplannedRuntimeIds }] }, { color: colorModelled });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: onHoldRuntimeIds }] }, { color: colorOnHold });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: plannedRuntimeIds }] }, { color: colorPlanned });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: drawnRuntimeIds }] }, { color: colorDrawn });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: demouldedRuntimeIds }] }, { color: colorDemoulded });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: productionEndedRuntimeIds }] }, { color: colorProductionEnded });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: availableForTransportRuntimeIds }] }, { color: colorAvailableForTransport });
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: guidsTransportedRuntimeIds }] }, { color: colorTransported });

                }

                const mobjectsExisting = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': 'BESTAAND' } } });
                for (const mobjects of mobjectsExisting) {
                    var modelId = mobjects.modelId;
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: colorExisting });
                }


            //debugInfo = debugInfo.concat("<br />Colored according to status");
            //$(debug).html(debugInfo);
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', 'Kleur elementen volgens planningsstatus');
        },
    });
});

function selectionChanged(data) {

}

$(function () {
    $("#setOdooLabels").dxButton({
        stylingMode: "outlined",
        text: "Plaats labels 'Merk.Serienummer' van geselecteerde",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met Odoogegevens ophalen');
            buttonIndicator.option('visible', true);
            try {
                var username = odooUsernameTextbox.dxTextBox("instance").option("value");
                var password = odooPasswordTextbox.dxTextBox("instance").option("value");
                if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
                    console.log("no username and/or password found");
                    throw "Gelieve gebruikersnaam en/of paswoord in te vullen.";
                }

                //Authenticate with MUK API
                var token = "";
                await $.ajax({
                    type: "POST",
                    url: odooURL + "/api/authenticate",
                    data: {
                        db: odooDatabase,
                        login: username,
                        password: password,
                    },
                    success: function (data) {
                        token = data.token;
                    }
                });

                let jsonArray = "[";
                const selection = await API.viewer.getSelection();
                const selector = {
                    modelObjectIds: selection
                };
                const mobjectsArr = await API.viewer.getObjects(selector);
                for (const mobjects of mobjectsArr) {
                    const objectsIds = mobjects.objects.map(o => o.id);
                    const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
                    for (const objproperties of objPropertiesArr) {
                        let cogX = 0.0;
                        let cogY = 0.0;
                        let cogZ = 0.0;
                        let guid = "";
                        let propertiesFound = 0;
                        for (const propertyset of objproperties.properties) {
                            for (const property of propertyset.properties) {
                                const propertyName = property.name;
                                const propertyValue = property.value;
                                if (typeof propertyName !== "undefined" && typeof propertyValue !== "undefined") {
                                    if (propertyName === "COG_X") {
                                        cogX = propertyValue;
                                        propertiesFound++;
                                    }
                                    else if (propertyName === "COG_Y") {
                                        cogY = propertyValue;
                                        propertiesFound++;
                                    }
                                    else if (propertyName === "COG_Z") {
                                        cogZ = propertyValue;
                                        propertiesFound++;
                                    }
                                    else if (propertyName === "GUID") {
                                        guid = propertyValue;
                                        propertiesFound++;
                                    }
                                }
                            }
                        }
                        if (propertiesFound != 4) {
                            continue;
                        }

                        var markId = "";
                        var rank;
                        var assemblyPos = "";
                        await $.ajax({
                            type: "GET",
                            url: odooURL + "/api/read",
                            data: {
                                token: token,
                                model: "trimble.connect.main",
                                domain: '[["name", "=", "' + guid + '"]]',
                                fields: '["id", "mark_id", "rank"]',
                            },
                            success: function (data) {
                                if (typeof data[0] !== 'undefined') {
                                    markId = data[0].mark_id[0];
                                    rank = data[0].rank;
                                }
                            }
                        });

                        if (markId === "") {
                            continue;
                        }

                        await $.ajax({
                            type: "GET",
                            url: odooURL + "/api/read",
                            data: {
                                token: token,
                                model: "project.master_marks",
                                domain: '[["id", "=", "' + markId + '"]]',
                                fields: '["id", "mark_ref"]',
                            },
                            success: function (data) {
                                assemblyPos = data[0].mark_ref;
                            }
                        });

                        if (assemblyPos === "") {
                            continue;
                        }

                        jsonArray = jsonArray.concat("{");
                        jsonArray = jsonArray.concat("\"color\": {\"r\": 60,\"g\": 203,\"b\": 62,\"a\": 255}, ");
                        jsonArray = jsonArray.concat("\"start\": ");
                        jsonArray = jsonArray.concat("{");
                        jsonArray = jsonArray.concat("\"positionX\": ");
                        jsonArray = jsonArray.concat(cogX);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionY\": ");
                        jsonArray = jsonArray.concat(cogY);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionZ\": ");
                        jsonArray = jsonArray.concat(cogZ);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"modelId\": ");
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat(mobjects.modelId);
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"objectId\": ");
                        jsonArray = jsonArray.concat(objproperties.id);
                        jsonArray = jsonArray.concat("}");
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"end\": ");
                        jsonArray = jsonArray.concat("{");
                        jsonArray = jsonArray.concat("\"positionX\": ");
                        jsonArray = jsonArray.concat(cogX);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionY\": ");
                        jsonArray = jsonArray.concat(cogY);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionZ\": ");
                        jsonArray = jsonArray.concat(cogZ);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"objectId\": null");
                        jsonArray = jsonArray.concat("}");
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"text\": ");
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat(assemblyPos + "." + rank);
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat("}");
                        jsonArray = jsonArray.concat(",");
                    }
                }

                jsonArray = jsonArray = jsonArray.slice(0, -1);
                jsonArray = jsonArray.concat("]");
                API.markup.removeMarkups();
                API.markup.addTextMarkup(JSON.parse(jsonArray));
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', "Plaats labels 'Merk.Serienummer' van geselecteerde");
        },
    });
});

var regexDate = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
function GetDateFromString(s) {
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

const assemblyTextBox = $('#placeholder').dxTextBox({
    placeholder: 'Geef een merk op, bvb K10 ...',
});

const propertyNameTextBox = $('#placeholderPropertyName').dxTextBox({
    placeholder: 'Geef een property name op, bvb. Default.MERKENPREFIX',
});

const propertyValueTextBox = $('#placeholderPropertyValue').dxTextBox({
    placeholder: 'Geef een property value op, bvb PS',
});

const prefixSelectionTagBox = $('#prefixSelection').dxTagBox({
    items: prefixes,
    showSelectionControls: true,
    applyValueMode: 'useButtons',
    //onValueChanged: function () {
    //    DevExpress.ui.notify("The button was clicked");
    //},
});

$(function () {
    $("#btnShowKnownPrefixes").dxButton({
        stylingMode: "outlined",
        text: "Toon enkel gekende prefixen",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met elementen te filteren');
            buttonIndicator.option('visible', true);
            try {
                const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
                for (const mobjects of mobjectsArr) {
                    var modelId = mobjects.modelId;
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });
                }

                var objectRuntimeIds = [];
                var modelIds = [];
                for (let i = 0; i < selected.length; i++) {
                    const mobjectsExisting = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': prefixes[i] } } });
                    if (!modelIds.includes(mobjectsExisting.modelId))
                        modelIds.push(mobjectsExisting.modelId);
                    objectRuntimeIds = objectRuntimeIds.concat(mobjectsExisting.objects.map(o => o.id));
                }
                for (const modelId of modelIds) {
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectRuntimeIds }] }, { visible: true });
                }
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', 'Toon enkel gekende prefixen');
        },
    });
});

$(function () {
    $("#button").dxButton({
        stylingMode: "outlined",
        text: "Selecteer o.b.v. gekozen filter",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: function (data) {
            data.component.option('text', 'Bezig met elementen te selecteren');
            buttonIndicator.option('visible', true);
            try {
                SetSelectionByFilter();
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', 'Selecteer o.b.v. gekozen filter');
        },
    });
});

function SetSelectionByFilter()
{
    var selectedItem = filterTypeSelectBox.dxSelectBox("instance").option("selectedItem");
    if (selectedItem === "Prefix") {
        var selected = prefixSelectionTagBox.dxTagBox("instance").option("selectedItems");
        for (let i = 0; i < selected.length; i++) {
            var actionType = i == 0 ? "set" : "add";
            setObjectSelectionByPropnameAndValue("Default.MERKPREFIX", selected[i], actionType);
        }
    }
    else if (selectedItem === "Merk") {
        var text = assemblyTextBox.dxTextBox("instance").option("value");
        setObjectSelectionByPropnameAndValue("Default.MERKNUMMER", text, "set");
    }
    else if (selectedItem === "Manueel gebruikersattribuut") {
        var propertyName = propertyNameTextBox.dxTextBox("instance").option("value");
        var propertyValue = propertyValueTextBox.dxTextBox("instance").option("value");
        setObjectSelectionByPropnameAndValue(propertyName, propertyValue, "set");
    }

    setObjectSelectionByPropnameAndValue("Tekla Common.Finish", "MONTAGE", "add");
}

$(function () {
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
});

$(function () {
    $("#showLabels").dxButton({
        stylingMode: "outlined",
        text: "Plaats labels 'Merk' van geselecteerde",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: function (data) {
            data.component.option('text', 'Bezig met labels plaatsen');
            buttonIndicator.option('visible', true);
            try {
                addTextMarkups();
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', "Plaats labels 'Merk' van geselecteerde");
        },
    });
});

async function setObjectsByProp() {
	return doObjectsFilter(async () => API.viewer.setSelection(getPropSelector(), "set"));
}

async function setObjectsByProp2() {
    await API.viewer.setSelection(getPropSelector(), "set");
}

async function setObjectSelectionByPropnameAndValue(propNameFilter, propValueFilter, selectionType) {
    await API.viewer.setSelection(getPropSelectorByPropnameAndValue(propNameFilter, propValueFilter), selectionType);
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

async function getObjectsByProp(e) {
    return getObjectsBy(async () => API.viewer.getObjects(getPropSelector()), e);
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

async function addTextMarkups() {
    try {
        //SetText2("Start adding markups");
        let jsonArray = "[";
        //SetText2(jsonArray);
        //const propSelector = getPropSelector();
        //await API.viewer.setSelection(propSelector, "set");
        //const mobjectsArr = await API.viewer.getObjects(propSelector);
        //const mobjectsArr = await API.viewer.getSelection();
        const selection = await API.viewer.getSelection();
        const selector = {
            modelObjectIds: selection
        };
        const mobjectsArr = await API.viewer.getObjects(selector);
        //SetText(mobjectsArr.length);
        //mobjectsArr type: ModelObjects[]
        //haalt enkel gemeenschappelijk hebben property sets op
        for (const mobjects of mobjectsArr) {
            //mobjects type: ModelObjects met mobjects.objects type: ObjectProperties[]
            const objectsIds = mobjects.objects.map(o => o.id);
            //const objectsRuntimeIds = await API.viewer.convertToObjectRuntimeIds(mobjects.modelId, objectsIds);
            const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
            for (const objproperties of objPropertiesArr) {
                //objproperties type: ObjectProperties
                let cogX = 0.0;
                let cogY = 0.0;
                let cogZ = 0.0;
                let assemblyPos = "";
                let propertiesFound = 0;
                for (const propertyset of objproperties.properties) {
                    for (const property of propertyset.properties) {
                        const propertyName = property.name;
                        const propertyValue = property.value;
                        if (typeof propertyName !== "undefined" && typeof propertyValue !== "undefined") {
                            if (propertyName === "COG_X") {
                                cogX = propertyValue;
                                propertiesFound++;
                            }
                            else if (propertyName === "COG_Y") {
                                cogY = propertyValue;
                                propertiesFound++;
                            }
                            else if (propertyName === "COG_Z") {
                                cogZ = propertyValue;
                                propertiesFound++;
                            }
                            else if (propertyName === "MERKNUMMER") {
                                assemblyPos = propertyValue;
                                propertiesFound++;
                            }
                        }
                    }
                }
                if (propertiesFound != 4) {
                    continue;
                }
                jsonArray = jsonArray.concat("{");
                //jsonArray = jsonArray.concat("\"id\": ");
                //jsonArray = jsonArray.concat(objproperties.id);
                //jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"color\": {\"r\": 60,\"g\": 203,\"b\": 62,\"a\": 255}, ");
                jsonArray = jsonArray.concat("\"start\": ");
                jsonArray = jsonArray.concat("{");
                jsonArray = jsonArray.concat("\"positionX\": ");
                jsonArray = jsonArray.concat(cogX);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionY\": ");
                jsonArray = jsonArray.concat(cogY);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionZ\": ");
                jsonArray = jsonArray.concat(cogZ);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"modelId\": ");
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat(mobjects.modelId);
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"objectId\": ");
                jsonArray = jsonArray.concat(objproperties.id);
                jsonArray = jsonArray.concat("}");
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"end\": ");
                jsonArray = jsonArray.concat("{");
                jsonArray = jsonArray.concat("\"positionX\": ");
                jsonArray = jsonArray.concat(cogX);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionY\": ");
                jsonArray = jsonArray.concat(cogY);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionZ\": ");
                jsonArray = jsonArray.concat(cogZ);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"objectId\": null");
                jsonArray = jsonArray.concat("}");
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"text\": ");
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat(assemblyPos);
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat("}");
                jsonArray = jsonArray.concat(",");
            }
        }
        //SetText2("Finished going through array");
        jsonArray = jsonArray = jsonArray.slice(0, -1);
        jsonArray = jsonArray.concat("]");
        API.markup.removeMarkups();
        //SetText2(jsonArray);
        API.markup.addTextMarkup(JSON.parse(jsonArray));
    }
    catch (e) {
        //SetErrorText("Error");
        //SetErrorText(e.message);
        //SetText2(jsonArray);
    }
}

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
            return (char * length + input).slice(-length);
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