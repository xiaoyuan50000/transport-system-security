let modal;
let _selfModal = {
    init: function(modalId){
        modal = new bootstrap.Modal(document.getElementById(modalId))
        return modal
    },
    show: function(){
        this.clean()
        modal.show()
    },
    hide: function(){
        this.clean()
        modal.hide()
    },
    clean: function(){
        $("form input").val("")
        $("form select").val("")
    }
}