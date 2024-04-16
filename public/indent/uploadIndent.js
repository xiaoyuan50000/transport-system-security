function uploadFile(e) {
    let file = $(e)[0].files[0];
    let filename = file.name;

    if (!isExcel(filename)) {
        simplyAlert('The file type must be xlsx.', 'red');
        return
    }

    let param = new FormData();
    param.append("file", file, filename);
    param.append('filename', filename);

    const config = {
        headers: { "Content-Type": "multipart/form-data;" }
    };

    axios.post('/upload/indent', param, config).then(function (res) {
        if (res.data.code == 1) {
            simplyAlert('Upload Success.');
            // console.log(res.data.data)
            window.location.reload();
        } else if (res.data.code == 0) {
            simplyAlert(res.data.msg, 'red');
            return
        }
    }).catch(function (error) {
        simplyAlert(error.message, 'red');
    });
}

function isExcel(filename) {
    let extension = filename.substring(filename.lastIndexOf('.') + 1);
    return extension === 'xlsx';
}