var frmOriginalData, 
    contactStorage = {};

/*** Start: Build JSON function. ***/
function getJSON(data) {
    var unindexed_array = data;
    var indexed_array = {};

    $.map(unindexed_array, function(n, i) {
        indexed_array[n['name'].split("_").pop()] = n['value'];
    });

   return indexed_array;
}
/*** End: Build JSON function. ***/

/*** Start: Build Datatables function. ***/
function buildDataTable(tblID,columnsArray,displayLength) {
    $('#'+tblID).DataTable({
        dom: 'Bfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        "iDisplayLength": displayLength,
        "aoColumnDefs": [
            { 'bSortable': false, 'aTargets': columnsArray }
        ],
        "language": {
            "emptyTable": "No records were found."
        }
    });
}
/*** End: Build Datatables function. ***/

/*** Start: Phone number format for US standard. ***/
$('.us-phone').on("keypress", formatPhoneUS);
function formatPhoneUS(e){
    var output,
    inputVal = $(this).val().replace(/[^0-9]/g, ''),
    area = inputVal.substr(0, 3),
    pre = inputVal.substr(3, 3),
    tel = inputVal.substr(6, 4);

    if(parseInt(inputVal,10)){
        if(area.length < 3){
            output = "(" + area;
        }else if(area.length === 3 && pre.length < 3){
            output = "(" + area + ")" + " " + pre;
        }else if(area.length === 3 && pre.length === 3){
            output = "(" + area + ")" + " " + pre + "-" + tel;
        }
    }

    if(e.key === 'Backspace') return;

    $(this).val(output);
};
/*** End: Phone number format for US standard. ***/

/*** Start: Go Back button triggers clearForm function. ***/
$('.go-back').on('click',clearForm); // Clear form data once user clicks on Go Back button.
function clearForm() {
    $("#frm_contacts").trigger("reset");
    $("#frm_contacts").find('input:hidden').val('');
}
/*** End: Go Back button triggers clearForm function. ***/

$("#frm_find").on("submit", findContacts);
function findContacts(e) {
    e.preventDefault();
    var frmFilter = $("#frm_filterby").val();
    
    if(frmFilter){
        $.ajax({
            type: "GET",
            url: "https://api.myjson.com/bins/11uszc?"+ new Date().getTime(),
            dataType: "json"
        }).done(function(obj){
                contactStorage = Object.keys(obj).filter(function (key) {
                    let entry = obj[key];
                    switch(frmFilter){
                        case '1':
                            return Number(entry.status) === 1;
                            break;
                        case '2':
                            return Number(entry.status) === 0;
                            break;
                        default:
                            return entry;
                    }
                }).reduce( (res, key) => (res[key] = obj[key], res), {} );

            showContacts(contactStorage);
        }).fail(function(jqXHR, textStatus, errorThrown){
            alert('Error: '+errorThrown);
        });
    }
}

function showContacts(contactStorage){
    var contactsTbl = "<table id='contactsTbl' class='table table-bordered'><thead><tr><th>Last</th><th>First</th><th>Email</th><th>Phone</th><th>Status</th><th class='text-center'>Edit</th><th class='text-center'>Delete</th></tr></thead><tbody>";
    
    if(contactStorage){
        for (var key in contactStorage) {
            contactsTbl += "<tr id='"+$.trim(contactStorage[key].id)+"'><td>"+$.trim(contactStorage[key].last)+"</td>";
            contactsTbl += "<td>"+$.trim(contactStorage[key].first)+"</td>";
            contactsTbl += "<td>"+$.trim(contactStorage[key].email)+"</td>";
            contactsTbl += "<td>"+$.trim(contactStorage[key].phone) +"</td>";
            contactsTbl += "<td>"+$.trim(Number(contactStorage[key].status) === 1 ? 'Active' : 'Inactive') +"</td>";
            contactsTbl += "<td class='text-center'><button class='btn btn-default btn-sm contact_edit' data-toggle='collapse' data-target='#save_contact,#search_contact'><span class='glyphicon glyphicon-edit'></span></button></td>"
            contactsTbl += "<td class='text-center'><button class='btn btn-default btn-sm contacts_delete'><span class='glyphicon glyphicon-remove'></span></button></td></tr>";
        }
    }
    
    contactsTbl += "</tbody></table><div class='row'><div class='col-xs-12 col-sm-12 col-md-12 col-lg-12'><div id='contact_message' class='alert message-submit'></div></div></div>";
    $('#contacts_list').empty().append(contactsTbl).show();
    buildDataTable('contactsTbl',[5,6],10);
}

$("#frm_contacts").on("submit", saveContact);
function saveContact(e){
    e.preventDefault(); // Prevnts default form submit.
    
    var frmObject = $(this),
        frmMessage = $(this).find(".message-submit"),
        objKey = $("#frm_id").val(),
        frmCurrentData = frmObject.find(":input:not('.no-serialize')").serialize();

    if(objKey && frmCurrentData === frmOriginalData){  
        frmObject.find(':submit').prop('disabled', true); // Disable submit button
        frmMessage.addClass('alert-warning').show().html('<strong>Info!</strong> Nothing changed on the form.').delay(5000).fadeOut('slow').queue(function(){
            frmObject.find(':submit').prop('disabled', false); // Disable submit button
            $(this).removeClass('alert-warning').dequeue();
        });
    }else{
        frmObject.find(':submit').prop('disabled', true); // Disable submit button

        if (contactStorage.hasOwnProperty(objKey)) { 
            contactStorage[objKey] = getJSON(frmObject.serializeArray()); 
        }else{
            var newKey = Math.max(...Object.keys(contactStorage)) + 1; // Generate new key for the object.
            $("#frm_id").val(newKey); // Set hidden id in the form in case if user tries to update the data right away.
            contactStorage[newKey] = getJSON(frmObject.serializeArray()); 
        }
        
        $.ajax({
            url:"https://api.myjson.com/bins/11uszc",
            type:"PUT",
            data: JSON.stringify(contactStorage),
            contentType:"application/json; charset=utf-8",
            dataType:"json"
        }).done(function(obj){
            showContacts(contactStorage); // Upload the table with contact records
            frmMessage.show().addClass("alert-success").html("Record successfully saved!").delay(5000).fadeOut('slow').queue(function(){
                $(this).removeClass("alert-success").dequeue();
                frmObject.find(':submit').prop('disabled', false);
            });
            frmOriginalData = frmObject.find(":input:not('.no-serialize')").serialize();
        }).fail(function(jqXHR, textStatus, errorThrown){
            alert('Error: '+errorThrown);
        });
    }
}

$('#contacts_list').on('click','#contactsTbl :button.contact_edit',editContact);
function editContact(){
    var recordID = $(this).closest('tr').attr('id'),
        contactRecord = contactStorage[recordID];

    if(contactRecord){
        $.each(contactRecord, function(name, value){
            var elementName = $('[name="'+'frm_'+name+'"]'),
                elementType = elementName.prop('type'),
                elementVal = $.trim(value);

            switch(elementType){
                case 'text':
                    elementName.val(elementVal);
                    break;
                case 'select-one':
                    elementName.val(elementVal);
                    break;
                case 'email':
                    elementName.val(elementVal);
                    break;
                case 'tel':
                    elementName.val(elementVal);
                    break;
                default:
                    elementName.val(elementVal);
            }
        });

        frmOriginalData = $("#frm_contacts").find(":input:not('.no-serialize')").serialize();
    }
}

var deleteID, targetTr;
$("#contacts_list").on("click", "#contactsTbl :button.contacts_delete", showModal); 
function showModal(){
    deleteID = $(this).closest('tr').attr('id'), // Get record ID.
    targetTr = $(this).parents('tr');
    
    var lastName = targetTr.find("td").eq(0).text(),
        firstName = targetTr.find("td").eq(1).text(),
        bodyContent = $('<p>You are about to delete record for <b>'+lastName+', '+firstName+'</b>.<p>Do you want to proceed?</p>');

    $('#delete_modalBody').empty().append(bodyContent); // Append elements to body content.
    $('#deleteModal').modal('show'); // Show delete modal box.
}

$("#deleteModal").on("click", ":button.confirm_delete", removeContact);
function removeContact(){
    if(deleteID){
        var table = $("#contactsTbl").DataTable().row(targetTr).remove().draw(); // Remove record from DataTable.
        delete contactStorage[deleteID];
        
        $.ajax({
            url:"https://api.myjson.com/bins/11uszc",
            type:"PUT",
            data: JSON.stringify(contactStorage),
            contentType:"application/json; charset=utf-8",
            dataType:"json"
        }).done(function(obj){
            $("#contact_message").show().addClass("alert-success").html("Record successfully removed.").delay(5000).fadeOut('slow').queue(function(){
                $(this).removeClass("alert-success").dequeue();
            });
        }).fail(function(jqXHR, textStatus, errorThrown){
            alert('Error: '+errorThrown);
        }); 
    }else{
        $("#contact_message").show().addClass("alert-danger").html("Error! Please contact your administrator.").delay(5000).fadeOut('slow').queue(function(){
            $(this).removeClass("alert-danger").dequeue(); 
        }); 
    }
}