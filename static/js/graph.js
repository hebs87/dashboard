queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);

function makeGraphs(error, salaryData) {
    //one crossfilter for the whole dashboard
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d) {
        //salary is = to an integer version of the salary
        d.salary = parseInt(d.salary);
    });


    //pass ndx variable, the crossfilter, to the function that is going to draw the graph, and pass it ndx
    //create one for each graph
    show_discipline_selector(ndx);

    show_gender_balance(ndx);
    show_average_salary(ndx);

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

//#average-salary graph
function show_average_salary(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    
    //adding function
    function addItem(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }
    //reducing function
    function removeItem(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        } else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }
    //initializer - creates an initial value for p
    function initialise() {
        return {count: 0, total: 0, average: 0};
    }
    //each of the reduce() functions have been created outside the below var, and they have been reduced and passed in
    var averageSalaryByGender = dim.group().reduce(addItem, removeItem, initialise);
    
    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(averageSalaryByGender)
        //we need to write a valueAccessor() to specify which of the 3 values (count, total or average) gets plotted
        .valueAccessor(function (d) {
            //round the value to 2 decimal places
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        //number of ticks that should appear on the y-axis
        .yAxis().ticks(4);
}

