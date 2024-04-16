(function ($) {

    let defaults = {
        splitStr: ',',
        dataKey: 'id',
        dataName: 'name',
        defaultValues: '',
        data: []
    };

    $.fn.multipleSelect = function (options) {
        let $ele = $(this);
        let defaultTemp = { ...defaults }
        let optionsTemp = $.extend(defaultTemp, options);
        $ele.attr('readonly', 'readonly');

        let eleId = "multiple-select-content-" + randomID();
        $ele.after(buildSelectContent($ele, optionsTemp, eleId));

        $ele.on('click', function () {
            $("#" + eleId).show();
            $("#" + eleId).focus();
            $ele.blur();
        });

        $("#" + eleId).on('blur', function () {
            $(this).hide();
        });

        $("#" + eleId + " .multiple-select-item-div").on('click', function () {
            selectItemClick(this, $ele)
        });

        let splitStr = optionsTemp.splitStr;
        return {
            getValue: function () {
                let values = [];
                $("#" + eleId).find('.multiple-select-item-checkbox.active').each(function () {
                    values.push($(this).attr('value'));
                });
                if (splitStr) {
                    return values.join(splitStr);
                } else {
                    return values;
                }
            },
            setValue: function (values) {
                let valuesArray = values ? values.split(splitStr) : [];
                let selectNameArray = [];
                $("#" + eleId).find('.multiple-select-item-checkbox').removeClass('active');
                $("#" + eleId).find('.multiple-select-item-checkbox').each(function () {
                    let itemValue = $(this).attr("value");
                    let selected = findValueSelected(valuesArray, itemValue)
                    if (selected) {
                        $(this).addClass('active');
                        $(this).find('.selected-img').attr('src', '/javascripts/multiple-select/selected-white.svg')
                        selectNameArray.push($(this).attr('name'));
                    }
                });
                $ele.val(selectNameArray.join(splitStr));
            },
            clearAll: function () {
                $("#" + eleId).find('.multiple-select-item-checkbox').removeClass('active');
                $("#" + eleId).find('.multiple-select-item-checkbox .selected-img').attr('src', '')
                $ele.val('');
            },
            selectAll: function () {
                $("#" + eleId).find('.multiple-select-item-checkbox').addClass('active');
                $("#" + eleId).find('.multiple-select-item-checkbox .selected-img').attr('src', '/javascripts/multiple-select/selected-white.svg')
                let selectNameArray = [];
                $("#" + eleId).find('.multiple-select-item-checkbox').each(function () {
                    selectNameArray.push($(this).attr('name'));
                });
                $ele.val(selectNameArray.join(splitStr));
            }
        }
    }

    function findValueSelected(valuesArray, itemValue) {
        return valuesArray.find(item => item == itemValue)
    }
    function buildSelectContent($ele, options, eleId) {
        let resultHtml = '<div tabindex="-1" class="multiple-select-content"  id="' + eleId + '" style="display: none;">';
        let datas = options.data;
        let defaultValues = options.defaultValues;
        let defaultValueArray = defaultValues ? defaultValues.split(options.splitStr) : [];
        let defaultNamesArray = [];
        if (datas && datas.length > 0) {
            datas.forEach(element => {
                let selected = defaultValueArray.find(item => item == element[options.dataKey]);
                if (selected) {
                    defaultNamesArray.push(element[options.dataName]);
                }
                resultHtml += '<div class="multiple-select-item-div">'
                    + '<div style="width: 30px;height: 100%;display: flex; align-items: center;">'
                    + '<div class="multiple-select-item-checkbox ' + (selected ? "active" : "") + '" value="' + element[options.dataKey] + '" name="' + element[options.dataName] + '">'
                    + '<img class="selected-img" src="' + (selected ? '/javascripts/multiple-select/selected-white.svg' : '') + '"></img>'
                    + '</div>'
                    + '</div>'
                    + '<div class="multiple-select-item-label">' + element[options.dataName] + '</div>'
                    + '</div>';
            });
        }
        resultHtml += '</div">';

        $ele.val(defaultNamesArray.join(options.splitStr));

        return resultHtml
    }

    function selectItemClick(item, $ele) {
        if ($(item).find('.multiple-select-item-checkbox').hasClass('active')) {
            $(item).find('.multiple-select-item-checkbox').removeClass('active')
            $(item).find('.multiple-select-item-checkbox .selected-img').attr('src', '')
        } else {
            $(item).find('.multiple-select-item-checkbox').addClass('active')
            $(item).find('.multiple-select-item-checkbox .selected-img').attr('src', '/javascripts/multiple-select/selected-white.svg')
        }

        let selectNameArray = [];
        let selectItems = $(item).parents('.multiple-select-content').find('.multiple-select-item-checkbox.active');
        if (selectItems && selectItems.length > 0) {
            selectItems.each(function () {
                selectNameArray.push($(this).attr('name'));
            });
            $ele.val(selectNameArray.join(','));
        } else {
            $ele.val('');
        }
    }

    
    function randomID() {
        return (Math.random().toString().substring(2) + Date.now()).toString(36);
    }

})(jQuery);