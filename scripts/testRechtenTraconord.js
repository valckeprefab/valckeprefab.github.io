var odooURL = "https://odoo.valcke-prefab.be"; //no slash at the end
var odooDatabase = "erp_prd"
var fetchLimit = 80;

var odooUsernameTextbox = $('#placeholderOdooUsername').dxTextBox({
    placeholder: "Entrez nom d'utilisateur Odoo, p ex Dorian Bal devient dbal.",
    inputAttr: {
        autocomplete: 'on',
        name: 'username'
    }
});

var odooPasswordTextbox = $('#placeholderOdooPassword').dxTextBox({
    mode: 'password',
    placeholder: "Entrez mot de passe Odoo",
    inputAttr: {
        autocomplete: 'on',
        name: 'password'
    }
});

var access_token = "";
var refresh_token = "";
var access_token_expiretime;
var client_id = "3oVDFZt2EVPhAOfQRgsRDYI9pIcdcdTGYR7rUSST";
var client_secret = "PXthv4zShfW5NORk4bKFgr6O1dlYTxqD8KwFlx1S";
async function getToken() {
    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    var password = odooPasswordTextbox.dxTextBox("instance").option("value");

    if (refresh_token !== "" && access_token_expiretime != undefined && access_token_expiretime.getTime() < Date.now() + 60 * 1000) {
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
            },
        });
        if (!refreshSuccesful) {
            access_token = "";
            refresh_token = "";
            access_token_expiretime = undefined;
        }
    }
    if (access_token === "") {
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
                access_token = data.access_token;
                refresh_token = data.refresh_token;
                access_token_expiretime = new Date(Date.now() + data.expires_in * 1000);
            }
        });
    }
    return access_token;
}

$("#btnTest").dxButton({
    stylingMode: "outlined",
    text: "Test",
    type: "success",
    onClick: async function (data) {
        var testData = [
            { table: "cust.prefix_to_ce", recordIdValcke: 5, recordIdTraconord: 5, divIdValcke: "divPrefixToCeValcke", divIdTraconord: "divPrefixToCeTraconord" },
            { table: "cust.silex_data", recordIdValcke: 4, recordIdTraconord: 4, divIdValcke: "divSilexDataValcke", divIdTraconord: "divSilexDataTraconord" },
            { table: "project.project", recordIdValcke: 2579, recordIdTraconord: 2516, divIdValcke: "divProjectValcke", divIdTraconord: "divProjectTraconord" },
            { table: "project.mark_drawings", recordIdValcke: 368809, recordIdTraconord: 368800, divIdValcke: "divMarkDrawingsValcke", divIdTraconord: "divMarkDrawingsTraconord" },
            { table: "project.mark_steel_pack", recordIdValcke: 1854, recordIdTraconord: 1865, divIdValcke: "divMarkSteelPacksValcke", divIdTraconord: "divMarkSteelPacksTraconord" },
            { table: "project.mark_steel_production", recordIdValcke: 35449, recordIdTraconord: 35209, divIdValcke: "divMarkSteelProductionValcke", divIdTraconord: "divMarkSteelProductionTraconord" },
            { table: "project.mark_steel_pack_items", recordIdValcke: 7038, recordIdTraconord: 7059, divIdValcke: "divMarkSteelPackItemsValcke", divIdTraconord: "divMarkSteelPackItemsTraconord" },
            { table: "project.master_marks", recordIdValcke: 204006, recordIdTraconord: 204001, divIdValcke: "divMasterMarkValcke", divIdTraconord: "divMasterMarkTraconord" },
            { table: "trimble.connect.main", recordIdValcke: 170510, recordIdTraconord: 170832, divIdValcke: "divTcMainValcke", divIdTraconord: "divTcMainTraconord" },
            { table: "vpb.delivery.slip", recordIdValcke: 24340, recordIdTraconord: 24302, divIdValcke: "divDeliverySlipValcke", divIdTraconord: "divTDeliverySlipTraconord" },
            { table: "vpb.delivery.slip.line", recordIdValcke: 106104, recordIdTraconord: 105957, divIdValcke: "divDeliverySlipLineValcke", divIdTraconord: "divDeliverySlipLineTraconord" },
        ];

        var colorOk = "rgb(0, 255, 0)";
        var colorNotOk = "rgb(255, 0, 0)";

        var token = await getToken();

        for(var test of testData)
        {
            var successValcke = false;
            var successTraconord = false;
            try
            {
                successValcke = await readTable(token, test.recordIdValcke, test.table);
            }
            catch (e) {

            }
            try
            {
                successTraconord = await readTable(token, test.recordIdTraconord, test.table);
            }
            catch (e) {

            }

            var elementValcke = document.getElementById(test.divIdValcke);
            var elementTraconord = document.getElementById(test.divIdTraconord);

            elementValcke.style.backgroundColor = successValcke ? colorOk : colorNotOk;
            elementValcke.textContent = successValcke ? "OK" : "PAS OK";
            elementTraconord.style.backgroundColor = successTraconord ? colorOk : colorNotOk;
            elementTraconord.textContent = successTraconord ? "OK" : "PAS OK";
        }
    },
});

async function readTable(token, id, table)
{
    var success = false;
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: table,
            domain: '[["id", "=", ' + id + ']]',
        },
        success: function (data) {
            if(data.length > 0)
                success = true;;
        }
    });
    return success;
}