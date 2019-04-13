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

    //related to #percentage-of-women-professors & #percentage-of-men-professors divs
    show_percent_that_are_professors(ndx, "Female", "#percent-of-women-professors");
    show_percent_that_are_professors(ndx, "Male", "#percent-of-men-professors");

    show_gender_balance(ndx);
    show_average_salary(ndx);
    show_rank_distribution(ndx);

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

//#percentage-of-women-professors & #percentage-of-men-professors number selectors
//function to calculate the percentage of male and female professors
function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        function(p, v) {
            //if sex is the specified gender this will increment the count
            if (v.sex === gender) {
                p.count++;
                //if the second rank is "Prof" the this will increment the are_prof
                if(v.rank === "Prof") {
                    p.are_prof++;
                }
            }
            return p;
        },
        function(p, v) {
            //if sex is the specified gender this will decrement the count
            if (v.sex === gender) {
                p.count--;
                //if the second rank is "Prof" the this will decrement the are_prof
                if(v.rank === "Prof") {
                    p.are_prof--;
                }
            }
            return p;
        },
        function() {
            //a count of total number of records and then a count of how many of those are profs
            return {count: 0, are_prof: 0};    
        },
    );
    
    //because we have 2 separate divs, we need to specify the actual element rather than the id - element must also be the 3rd argument in the function
    dc.numberDisplay(element)
        //shows the number as a percentage to 2 decimal places
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProf);
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

//#rank-distribution graph
function show_rank_distribution(ndx) {
    //we need to work out what percentage of men are professors, assistant profs and associate profs.. and the same for women
    //generalised function to that can be called multiple times
    function rankByGender (dimension, rank) {
        return dimension.group().reduce(
            //add function
            function (p, v) {
                p.total++;
                //we'll only increment the total if the rank is the rank which is specified in the call var
                if(v.rank == rank) {
                    p.match++;
                }
                return p;
            },
            //remove function
            function (p, v) {
                p.total--;
                //we'll only decrement the total if the rank is the rank which is specified in the call var
                if(v.rank == rank) {
                    p.match--;
                }
                return p;
            },
            //initialise function
            //total for the number of rows we are dealing with; match for a count of rows that are professors
            function () {
                return {total: 0, match: 0};
            }
        );
    }
    
    var dim = ndx.dimension(dc.pluck('sex'));
    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");
    
    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(dim)
        //include a 2nd argument which is a label for the legend of the chart
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "Asst Prof")
        .stack(assocProfByGender, "Assoc Prof")
        //the total part of our data structure, our value, is the total number of men or women that have been found
        //the match is the number of those that are professors, asst profs and assoc profs, and so on
        //so we need the percentage of the total as the match for each value (times by 100)
        .valueAccessor(function(d) {
            if(d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 30});
}
