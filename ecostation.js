function main() {
    // Holder.add_theme("white", { background:"#fff", foreground:"#a7a7a7", size:10 });
    var log  = console.log;
 
    d3.json("https://cdn.rawgit.com/Edmonton-Open-Data/Edmonton-Eco-Stations/master/data/Eco_Station_Monthly_Users.json",
        function(error, data) {
            if(error) throw error;
 
            /* filtered out the 2017 entries the months are not complete we are still in the year of 2017
                then overwrite entries with the filtered entries
            */ 
            data = data.filter(function(d) { return d["year"] != "2017"; });
 
            /*of_users, month, year, and id to number objects
                datetime to a date object
                converting strings to objects mentioned above
            */
            data.forEach(function(d) {
                d.of_users = +d.of_users;
                d.id = +d.id;
                d.datetime = new Date(d.datetime);
                d.month = d.datetime.getMonth();
                d.year = d.datetime.getFullYear();
            });
 
            //cross filter instance
            var facts = crossfilter(data);
 
            //chart variables
            var monthNames        = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            var sumOfUsersReduced = data
                                        .map(function(d) { return d.of_users; })
                                        .reduce(function(sum, value) { return sum + value; }, 0);//reduced sum of all users
 
            //dimensions
            var yearDimension  = facts.dimension(function(d) { return d.year; });
            var monthDimension = facts.dimension(function(d) { return monthNames[d.month]; });
 
            //groups
            var yearGroupPie  = yearDimension.group().reduceSum(function(d) {return (d.of_users/sumOfUsersReduced) * 100; });
            var groupByUsers  = function(d) { return d.of_users; };
            var yearGroupLine = yearDimension.group().reduceSum(groupByUsers);
            var monthGroup    = monthDimension.group().reduceSum(groupByUsers);
            var sumOfAllUsers = facts.groupAll().reduceSum(groupByUsers);
 
            //charts
                barChart  = dc.barChart("#bar-chart");
                lineChart = dc.lineChart("#line-chart");
                pieChart  = dc.pieChart("#pie-chart");
            var charts    = [barChart, lineChart, pieChart];
 
            //chart variables
            var chartHeightScale = 0.42;
            var pieXscale        = 1.55;
            var pieYscale        = 2.0;
            var pieRscale        = 0.48;
            var pieInnerRscale   = pieRscale * 0.50;
 
            //---------------------dc_charts---------------------
            charts
                  .filter(function(chart) { return chart != lineChart; })
                  .forEach(function(chart){
                      chart.on("filtered." + chart.chartID(), function() {
                          //update the sum text
                          d3.select("#sum").html( sumOfAllUsers.value().toLocaleString() );
                          //update the percent text
                          d3.select("#percent").html( ((sumOfAllUsers.value()/sumOfUsersReduced) * 100).toFixed(3) );
                      });
                  });
            
             barChart
                    .dimension(monthDimension)
                    .group(monthGroup)
                    .height(setHeight(barChart))
                    .margins({
                         top:    Math.round(barChart.height() * 0.02, 1),
                         right:  Math.round(barChart.width() * 0.04, 1),
                         bottom: Math.round(barChart.height() * 0.10, 1),
                         left:   Math.round(barChart.width() * 0.10, 1)
                     })
                    .useViewBoxResizing(true)
                    .barPadding(0.04)
                    .title(function(d) { return d.key +': '+ d.value.toLocaleString(); })
                    .x(d3.scale.ordinal().domain(monthNames))
                    .xUnits(dc.units.ordinal)
                    .elasticY(true)
                    .on("pretransition.baryAxis", function(chart, filter){
                         chart.selectAll("#bar-chart g.tick text")
                              .style("font-size", Math.round(chart.height() * 0.05, 1));                    
                     });
            barChart.yAxis().ticks(6);
 
            lineChart
                    .dimension(yearDimension)
                    .group(yearGroupLine)
                    .height(setHeight(lineChart))
                    .margins({
                         top:    Math.round(lineChart.height() * 0.02, 1),
                         right:  Math.round(lineChart.width() * 0.04, 1),
                         bottom: Math.round(lineChart.height() * 0.10, 1),
                         left:   Math.round(lineChart.width() * 0.10, 1)
                     })
                    .useViewBoxResizing(true)
                    .elasticY(true)
                    .brushOn(false)
                    .x(d3.scale.linear().domain(d3.extent(yearGroupLine.all(), function(d) { return d.key; })))
                    .renderArea(true)
                    .on("pretransition.lineyAxis", function(chart, filter){
                         chart.selectAll("#line-chart g.tick text")
                              .style("font-size", Math.round(chart.height() * 0.05, 1));                    
                     });
            lineChart.xAxis().ticks(4).tickFormat(d3.format(".0f"));
 
            pieChart.dimension(yearDimension)
                    .group(yearGroupPie)
                    .height(setHeight(pieChart))
                    .useViewBoxResizing(true)
                    .radius(pieChart.height() * pieRscale)
                    .innerRadius(pieChart.height() * pieInnerRscale)
                    .cx(pieChart.width() / pieXscale)
                    .cy(pieChart.height() / pieYscale)
                    .label(function(d) { return d.value.toFixed(2) + '%'; })
                    .title(function(d) { return d.key+': '+ (Math.round((d.value/100) * sumOfUsersReduced, 1)).toLocaleString(); })
                    .legend(dc.legend()
                              .y(Math.round(pieChart.height() * 0.02 , 1))
                              .gap(Math.round(pieChart.height() * 0.02 , 1))
                    )
                    //https://github.com/dc-js/dc.js/blob/master/web/examples/pie-external-labels.html
                    //solution for adding dynamic data to legend
                    .on("pretransition.legend", function(chart) { 
                         chart.selectAll(".dc-legend-item text")      
                             .text('')
                             .append("tspan")
                             .text(function(d) { return d.name; })
                             .style("font-size", Math.round(chart.height() * 0.055, 1))
                             .append("tspan")
                             .attr('x', Math.round(pieChart.width() * 0.195, 1))
                             .attr("text-anchor", "end")
                             .text(function(d) { return Math.round((d.data/100) * sumOfUsersReduced, 1).toLocaleString(); })
                             .style("font-size", Math.round(chart.height() * 0.055, 1));
 
                         chart.selectAll("text.pie-slice")
                              .style("font-size", Math.round(pieChart.height() * 0.055, 1));   
                    });
 
            dc.renderAll();
            //~-~-~~-~-~~-~-~~-~-~~-~-~Addition_to_pie_chart~-~-~~-~-~~-~-~~-~-~~-~-~
            var texts = [   {
                                class:         "stats-title", 
                                x:             0, 
                                y:             pieChart.height() * 0.95, 
                                content:       "Sum:", 
                                "text-anchor": "start"
                            },
                            {
                                id:            "sum", 
                                x:             pieChart.width() * 0.09, 
                                y:             pieChart.height() * 0.95, 
                                content:       sumOfAllUsers.value().toLocaleString(), 
                                "text-anchor": "start",
                                "font-size":   Math.round(pieChart.height() * 0.14, 1)
                            },
                            {
                                class:         "stats-title",
                                x:             pieChart.cx(), 
                                y:             pieChart.height() * 0.46, 
                                content:       "Percentage:",
                                "text-anchor": "middle"
                            },
                            {
                                id:            "percent", 
                                x:             pieChart.cx(), 
                                y:             pieChart.height() * 0.58, 
                                content:       ((sumOfAllUsers.value()/sumOfUsersReduced) * 100).toFixed(3),
                                "text-anchor": "middle",
                                "font-size":   Math.round(pieChart.height() * 0.12, 1)
                            }                       
                        ];
 
            d3.select("#pie-chart > svg")
               .selectAll("texts")
               .data(texts).enter()
               .append("text")
               .style( "font-size", function(d) { return d["font-size"] ? d["font-size"] : Math.round(pieChart.height() * 0.08, 1); } )
               .text( function(d) { return d.content; } )
               .attr({
                    id:            function(d) { return d.id ? d.id : ""; },
                    class:         function(d) { return d.class ? d.class : ""; },
                    x:             function(d) { return d.x; },
                    y:             function(d) { return d.y; },
                    "text-anchor": function(d) { return d["text-anchor"]; }
                });
 
            //~-~-~~-~-~~-~-~~-~-~~-~-~Addition_to_pie_chart~-~-~~-~-~~-~-~~-~-~~-~-~
            //---------------------dc_charts---------------------
 
 
            //---------------------leaflet_map---------------------
            var map = L.map("map-plot",{
                zoom: 9
            });
            var OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            });
            var ecoStations = [
                    {
                        "address":    "11440 143 Street",
                        "ecoStation": "Coronation",
                        "region":     "Northwest",
                        "coord":      [53.56395, -113.56850]
                    },
                    {
                        "address":    "5355 127 Ave",
                        "ecoStation": "Kennedale",
                        "region":     "Northeast",
                        "coord":      [53.58437, -113.42350]
                    },
                    {
                        "address":    "5150 99 Street",
                        "ecoStation": "Strathcona",
                        "region":     "Central",
                        "coord":      [53.48853, -113.48772]
                    },
                    {
                        "address":    "14710 Ellerslie Road",
                        "ecoStation": "Ambelside",
                        "region":     "Southwest",
                        "coord":      [53.42599, -113.57489]
                    }
                ];
            map.setView([53.537042913738745, -113.51417541503908]);
 
            OpenStreetMap.addTo(map);
            
            var markers = ecoStations.map(function(station){ 
                    return L.marker(station.coord)
                            .bindPopup(station.address+"<br>"+station.ecoStation+"<br>"+station.region).addTo(map);
                });
            //---------------------leaflet_map---------------------
 
            function setHeight(chart) { 
                return chart.width() * chartHeightScale; 
            }    
 
        }
    );
 }  
 
 window.onload = main;
  