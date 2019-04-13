queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);

function makeGraphs(error, salaryData) {
    //one crossfilter for the whole dashboard
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d) {
        //salary is = to an integer version of the salary
        d.salary = parseInt(d.salary);
        //related to 2nd scatter plot - parse yrs.since.phd from string to integer and get rid of the dots by renaming it yrs_since_phd
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
        //relates to scatter-plot - wrapping in square brackets rather than using dot notation as yrs.service in csv file has dot, so would cause problems
        d.yrs_service = parseInt(d["yrs.service"]);
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

    //scatter plots
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);

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
        .width(350)
        .height(250)
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
        .width(350)
        .height(250)
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
        .width(350)
        .height(250)
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
        .xAxisLabel("Gender")
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 30});
}

//#service-salary scatter plot
function show_service_to_salary_correlation(ndx) {
    //add colors to scatter plot - pick an attribute and map the values in that attribute to the colors we want
    var genderColors = d3.scale.ordinal()
        .domain("Female", "Male")
        .range(["blue", "pink"]);
    
    //first dim on years of service
    var serviceDim = ndx.dimension(dc.pluck("yrs_service"));
    //second dim returns array with two parts - one being length of service and other being the salary - this allows us to plot the dots
    var serviceVsSalaryDim = ndx.dimension(function(d) {
        //service will be used to plot x coordinate, salary used to plot the y, rank will be in hover tooltip sex is used to pass in the colors to the chart
        return [d.yrs_service, d.salary, d.rank, d.sex];
    });
    var experienceSalaryGroup = serviceVsSalaryDim.group();

    //we need min and max length of service - we take this from the serviceLength dim and use top and bottom
    var minExperience = serviceDim.bottom(1)[0].yrs_service;
    var maxExperience = serviceDim.top(1)[0].yrs_service;    

    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        //linear scale as we are dealing with numbers, and the domain will be min/maxExperince
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        //leaves room near the top
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Of Service")
        //what will appear as a tooltip when hovering over a dot
        .title(function(d) {
            //d.key[1] refers to the years of serviceVsSalary dim we created, and picks the d.salary value, d.key[2] refers to rank
            return d.key[2] + " earned " + d.key[1];
        })
        //add colors to graph and specify how the chart can pick out the values it needs to pass in to the scale to pick the colors - need to add to serviceVsSalaryDim
        .colorAccessor (function(d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(serviceVsSalaryDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}

//#phd-salary scatter plot - copied and pasted from #service-salary scatter plot and renamed some vars
function show_phd_to_salary_correlation(ndx) {
    //add colors to scatter plot - pick an attribute and map the values in that attribute to the colors we want
    var genderColors = d3.scale.ordinal()
        .domain("Female", "Male")
        .range(["pink", "blue"]);
    
    //first dim on years of service
    var phdServiceDim = ndx.dimension(dc.pluck("yrs_since_phd"));
    //second dim returns array with two parts - one being length of service and other being the salary - this allows us to plot the dots
    var phdSalaryDim = ndx.dimension(function(d) {
        //service will be used to plot x coordinate, salary used to plot the y, rank will be in hover tooltip sex is used to pass in the colors to the chart
        return [d.yrs_since_phd, d.salary, d.rank, d.sex];
    });
    var phdSalaryGroup = phdSalaryDim.group();

    //we need min and max length of service - we take this from the serviceLength dim and use top and bottom
    var minPhd = phdServiceDim.bottom(1)[0].yrs_since_phd;
    var maxPhd = phdServiceDim.top(1)[0].yrs_since_phd;

    dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        //linear scale as we are dealing with numbers, and the domain will be min/maxExperince
        .x(d3.scale.linear().domain([minPhd, maxPhd]))
        .brushOn(false)
        .symbolSize(8)
        //leaves room near the top
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Since PhD")
        //what will appear as a tooltip when hovering over a dot
        .title(function(d) {
            //d.key[1] refers to the years of serviceVsSalary dim we created, and picks the d.salary value, d.key[2] refers to rank
            return d.key[2] + " earned " + d.key[1];
        })
        //add colors to graph and specify how the chart can pick out the values it needs to pass in to the scale to pick the colors - need to add to serviceVsSalaryDim
        .colorAccessor (function(d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(phdSalaryDim)
        .group(phdSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}

