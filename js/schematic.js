---
---
(function () {
  var signal = d3.dispatch(
        "update"
        , "selectYear"
        , "downloadCurrentLimits"
        , "downloadAllLimits"
        , "navigate"
        , "highlight"
        , "sortMode"
      )
    , grid = Grid()
          .tooltipContent(tooltipContent)
          .connect(signal)
    , atlas = Atlas()
          .tooltipContent(tooltipContent)
          .connect(signal)
    , tip = d3.tip().attr('class', 'd3-tip')
    , tabs = {}
    , query = {}
  ;
  // {% capture tabs %}{% for tab in site.data.tabs %}{{ tab.section }},{% endfor %}{% endcapture %}
  liquidToArray('{{ tabs }}').forEach(function(tab) { tabs[tab] = Tabulus(); });

  // Load the data and kick-off the visualization.
  d3.queue()
    .defer(d3.csv, "data/CSVs/Laws_02_Contributions_1.csv")
    .defer(d3.csv, "data/CSVs/Laws_02_Contributions_2.csv")
    .defer(d3.csv, "data/CSVs/Laws_02_Contributions_3.csv")
    .defer(d3.csv, "data/CSVs/Laws_03_Disclosure_1.csv")
    .defer(d3.csv, "data/CSVs/Laws_03_Disclosure_2.csv")
    .defer(d3.csv, "data/CSVs/Laws_03_Disclosure_3.csv")
    .defer(d3.csv, "data/CSVs/Laws_04_PublicFinancing.csv")
    .defer(d3.csv, "data/CSVs/Laws_05_Other.csv")
    .defer(d3.json, "data/usa.json")
      .await(visualize)
  ;

  // Responsive
  d3.select(window)
      .on("resize", function() {
          grid.resize()
            () // Call the grid as well
          ;
        })
  ;

  /*
  ** Helper Functions
  */
  function tooltipContent(d) {
      return "<span style='text-align: center;'>"
        + "<h4>" + d.State + " " + d.Year + "</h4>"
        + "<h5>" + grid.selectedColumnLabel() + "</h5>"
        + "<h4>" + grid.format()(grid.valueAccessor()(d)) + "</h4>"
        + "</span>"
      ;
  }

  /*
  ** Main Functions
  */
  function visualize(error, contribs, contribs2, contribs3, disclosure1, disclosure2, disclosure3, publicFinancing, other, usa){
      if(error) throw error;

      carto(usa);
      corpus(contribs, contribs2, contribs3, disclosure1, disclosure2, disclosure3, publicFinancing, other);

      setupTabNavigation();

      // Initialize the selected year to the most recent.
      signal.call("selectYear", null, d3.select("#chooser-year").node().value);

      // Initialize the navigation state.
      getQueryVariables(); // populate the query variable

      d3.select("a[href='#" + query.section + "']")
        .node()
        .click()
      ;
  } // visualize()

  function corpus() {
      var data = d3.nest()
            .key(function(d) {
                // Construct the identifier from these two fields,
                // because the value of d.Identifier is not reliable.
                return d.State + d.Year;
              })
            .rollup(function(leaves) { return Object.assign.apply(null, leaves); })
            .map(d3.merge(arguments)
  {% if site.filterYear %}.filter(function(d) { return d.Year != +{{ site.filterYear }}; }){% endif %})
            .values()
      ;
      grid
          .svg(d3.select("svg#main"))
          .data(data)
          .tooltip(tip)
        () // Call grid()
      ;
      var years = d3.extent(data, function(d){ return +d.Year; });
      // Populate Year Selector
      d3.select("#chooser-year")
          .on("change", function() {
              signal.call("selectYear", null, this.value);
            })
        .select("optgroup").selectAll("option")
          .data(d3.range(years[0], years[1] + 2, 2).reverse(), identity)
        .enter().append("option")
          .attr("value", identity)
          .text(identity)
          .property("selected", function(d, i) { return !i ? "selected" : null; })
      ;

      // Signal Handling
      d3.select(".controls .checkbox input")
          .on("change", function() { grid.empty(this.checked)(); })
      ;
      d3.select(".alphabetize-states-button")
          .on("click", function() { grid.reset()(); })
      ;
      signal.on("selectYear.grid", grid.selectedYear);
      signal.on("selectYear.chooser", function (selectedYear){
          d3.select("#chooser-year").node().value = selectedYear;
        })
      ;
      signal.on("downloadAllLimits", function (xColumn, yColumn){
          var filename = "CFI-contribution-limits-all.csv";
          var projectedData = project(data, [xColumn, yColumn].concat(columnsRaw));
          downloadCSV(projectedData, filename);
        })
      ;
      signal.on("downloadCurrentLimits", function (xColumn, yColumn, selectedColumn){
          var filename = "CFI-contribution-limits-" + selectedColumn + ".csv";
          var projectedData = project(data, [xColumn, yColumn, selectedColumn]);
          downloadCSV(projectedData, filename);
        })
      ;
      // Set the URL history to the current section.
      signal.on("navigate.history", function (section) {
          window.location.hash = '#' + section;
        })
      ;
      // Update the visualization according to the current section.
      signal.on("navigate.vis", function (section) {
          tabs[section](data);
        })
      ;

  } // corpus()


  function carto (usa){
      d3.select("svg#map")
          .datum(usa)
          .call(atlas.tooltip(tip))
      ;
      signal.on("update", atlas.update);
  } // carto()


  // Helper Utility Functions
  function identity(d) { return d; }

  // Capture URL query param
  function getQueryVariables() {
      var arg // loop variable
        , qstr = window.location.search.substring(1).toLowerCase().split("&")
        , defaultSection = 'contribution-limits'
      ;
      qstr.forEach(function(q) {
          arg = q.split("=");
          if(arg[0].length && arg[1].length)
              vars[arg[0]] = decodeURIComponent(arg[1]);
        })
      ;
      query.section = window.location.hash.substring(1).toLowerCase()
        || defaultSection
      ;
  } // getQueryVariables()

  // Convert a formatted liquid template string into a usable array for Javascript
  //  Basically, it takes a list of strings and splits into an array
  function liquidToArray(str) {
      return str
        .split(',')
        .filter(identity)
      ;
  } // liquidToArray()

  // Causes the given data to be downloaded as a CSV file with the given name.
  // Draws from
  // http://stackoverflow.com/questions/12676649/javascript-programmatically-trigger-file-download-in-firefox
  function downloadCSV(data, filename) {
      var csvStr = d3.csvFormat(data);
      var dataURL = "data:text," + encodeURIComponent(csvStr);
      var link = document.createElement("a");
      document.body.appendChild(link);
      link.setAttribute("href", dataURL);
      link.setAttribute("download", filename);
      link.click();
  } // downloadCSV()

  // Performs a projection on the data, isolating the specified columns.
  // Term from relational algebra. See also
  // https://en.wikipedia.org/wiki/Projection_(relational_algebra)
  function project(data, columns) {
      return data.map(function (fullRow) {
          return columns.reduce(function (projectedRow, column) {
              projectedRow[column] = fullRow[column];
              return projectedRow;
          }, {});
      });
  } // project()

  function setupTabNavigation() {
      d3.select(".nav").selectAll("li a")
          .on("click", function (d){
              signal.call("navigate", null, this.href.split('#')[1]);
          })
      ;
  } // setupTabNavigation()

  var colorScale = {};
  {% for section in site.data.sections %}
  colorScale["{{ section[0] }}"] = {};
    {% for legend in section[1].legends %}
      {% capture bins %}{% for item in legend.scale %}{% unless forloop.last %}{{ item.max }}{% endunless %},{% endfor %}{% endcapture %}
      {% capture colors %}{% for item in legend.scale %}{{ item.color }},{% endfor %}{% endcapture %}
      {% capture labels %}{% for item in legend.scale %}{{ item.label }},{% endfor %}{% endcapture %}
      {% capture scale %}{% if legend.type == "threshold" %}Threshold{% else %}Ordinal{% endif %}{% endcapture %}
  colorScale["{{ section[0] }}"]["{{ legend.name }}"] = d3.scale{{ scale }}()
      .range(liquidToArray('{{ colors }}'))
      .domain(liquidToArray(
        {% if legend.type == "threshold" %}'{{ bins }}').map(function(d) { return +d + 1; }
        {% elsif legend.type == "ordinal" %}'{{ labels }}'
        {% endif %}))
  ;
  {% if legend.type == "threshold" %}colorScale["{{ section[0] }}"]["{{ legend.name }}"].emptyValue = {{ legend.fallback }};{% endif %}
    {% endfor %}
  {% endfor %}
  d3.selectAll(".tab-pane").each(function(d, i) {
      var name = this.id;
      d3.select(this).call(tabs[name].colorScale(colorScale[name]).grid(grid));
    })
  ;
}());
