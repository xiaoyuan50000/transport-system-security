async function Encrypt() {
    let val = $("input").val()
    if (val != "") {
        await axios.post('/aesEncryption', { data: val }).then(res => {
            let result = res.data.data
            $("textarea").val(result)
        })
    }
}


$('.custom-file-input').on('change', function () {
    uploadFile(this, '/upload/updateOldIndentsDate');
    $(this).val('');
});

$('.contract-file-input').on('change', function () {
    uploadFile(this, '/upload/newContract');
    $(this).val('');
});

function uploadFile(e, url) {
    let file = $(e)[0].files[0];
    let filename = file.name;

    if (!isExcel(filename)) {
        alert('The file type must be xlsx.');
        return
    }

    let param = new FormData();
    param.append("file", file, filename);
    param.append('filename', filename);

    const config = {
        headers: { "Content-Type": "multipart/form-data;" }
    };
    
    axios.post(url, param, config).then(function (res) {
        if (res.data.code == 1) {
            alert("success");
            //window.location.reload();
            return
        } else if (res.data.code == 0) {
            alert(res.data.msg);
            return
        }
    }).catch(function (error) {
        alert(error.message);
    });

}
function isExcel(filename) {
    let extension = filename.substring(filename.lastIndexOf('.') + 1);
    if (extension !== 'xlsx') {
        return false;
    }
    return true;
}