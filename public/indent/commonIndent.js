$(document).on("click", function (e) {
    let target = e.target;
    if (target.id != "search1" && target.id != "search2" && target.id != "pickupDestination" && target.id != "dropoffDestination"
        && target.id != "search-unit1" && target.id != "groupSelectId"
        && target.id != "search-unit2" && target.id != "indent-unit") {
        $('.search-select').css("display", "");
        $('.unit-search-select').css("display", "");
    }
});