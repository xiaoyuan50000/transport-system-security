var MaskUtil = function(){
    var $mask;
    var $maskMsg = 'Loading...';
    function init(){
        if(!$mask){
            var data = `<div class="modal fade" id="myWaitingModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true" data-keyboard="false" data-backdrop="static">
              <div class="modal-dialog modal-sm modal-dialog-centered w-25">
                <div class="modal-content" style="background: none; border: none;">
                  <div class="modal-body">
                    <div class="row">
                        <div class="spinner-border text-primary ml-auto mr-auto" role="status"></div>
                    </div>
                    <div class="row">
                      <div class="text-white ml-auto mr-auto" style="font-size: 28px">${$maskMsg}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>`;
            $mask = $(data).appendTo("body");
        }
    }
    return {
        mask:function(){
            init();
            $('#myWaitingModal').modal('show');
        },
        unmask:function(){
            setTimeout(function() {
                $('#myWaitingModal').modal('hide');
                $('#myWaitingModal').remove();
                $('.modal-backdrop').hide();
                $mask = null;
            },200);
        }
    }
}();