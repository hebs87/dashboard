queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);

function makeGraphs(error, salaryData) {
    //one crossfilter for the whole dashboard
    var ndx = crossfilter(salaryData);

    //pass ndx variable, the crossfilter, to the function that is going to draw the graph, and pass it ndx
    //create one for each graph
    show_discipline_selector(ndx);

    show_gender_balance(ndx);

    dc.renderAll();
}

//function for rendering Select menu
function show_discipline_selector(ndx) {
    dim = ndx.dimension(dc.pluck('discipline'));
    group = dim.group()
    
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}

//inside this function, we can now focus on specifically one graph - each graph will have its own function
//follow same pattern for every graph - create a div, create a function and have the graph rendered in the div

//#gender-balance graph
function show_gender_balance(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();
    
    dc.barChart("#gender-balance")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        //x-axis will be ordinal as that dimension consists of words, then the y-axis will be the count of how many times each of those there were
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        //.elasticY(true) makes the bars stay the same height when crossfiltering, so only the values on the y-axis change
        .xAxisLabel("Gender")
        //number of ticks that should appear on the y-axis
        .yAxis().ticks(20);
}