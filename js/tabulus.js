function Tabulus() {
    /*
    ** Private variables
    */
    var container
      , colorScale
      , grid
      , dropdowns
      , dispatch
      , query
    ;
    /*
    ** Main Function Object
    */
    function my(sel) {
        if(!query) {
            query = {};
            container = container || sel;
            dropdowns = dropdowns || container.selectAll("select");
            dropdowns.selectAll("option")
                .datum(function() { return this.dataset; }) // create datum from data-* attributes
                .attr("selected", function(d, i) {
                    return !i ? "selected" : null;
                  })
            ;
            dropdowns
                .on("change", function() {
                    // Q&A dropdowns have no id, just the class "question"
                    // The contrib limits dropdowns have unique identifiers
                    var key = this.id.split("chooser-")[1] || "question"
                      , self = d3.select(this)
                      , datum = self.select("option[value='" + this.value + "']")
                            .datum()
                    ;
                    query.question = null;
                    query[key] = datum;
                    query.disabled = self.attr("disabled");

                    if(datum.disable) {
                        dropdowns.each(function() {
                            var name = this.id.split("chooser-")[1]
                              , value = this.value
                            ;
                            d3.select(this)
                                .attr("disabled"
                                    , name === datum.disable ? "disabled" : null
                                  )
                                .property("value"
                                    , name === datum.disable ? "" : value
                                  )
                            ;
                          })
                        ;
                    }
                    update();
                  })
            ;
        }
        // Call the "change" handler function for the first dropdown to trigger render
        container.select("select").each(function() {
            d3.select(this).on("change").apply(this, []);
          })
        ;
    } // my()


    /*
    * Private Helper Functions
    */
    function update() {
        if(query.question) {
            var question = query.question;
            container.select(".field-description")
                .html(question.question + (
                    question.note
                      ? ("*\n\n* " + question.note)
                      : ""
                  ))
            ;
        } else {
            if(!(query.donor && query.recipient)) return;
            if(query.recipient.value === "Cand" && !query.branch) return;
            query.question = {};
            query.question.value = query.donor.value
              + "To"
              + query.recipient.value
              + "Limit"
              + (query.branch
                  ? (query.branch.disabled ? "" : "_" + query.branch.value)
                  : ""
                )
              + "_Max"
            ;
            query.question.label = query.donor.label
              + " to "
              + query.recipient.label
              + (query.branch
                  ? (query.branch.disabled ? "" : "(" + query.branch.label + ")")
                  : ""
                )
            ;
            query.question.legend = query.donor.legend || "default";
        }
        grid
            .colorScale(colorScale[query.question.legend])
            .selectedColumn(query.question.value)
            .selectedColumnLabel(query.question.label)
          () // Call grid()
        ;
        toggleLegend(query.question.legend);
    } // update()

    function toggleLegend(legend){
        container.selectAll(".legend ul")
            .style("display", function() {
                return d3.select(this).classed("legend-" + legend)
                  ? null
                  : "none"
                ;
              })
        ;
    } // toggleLegend()

    /*
    ** API - Getter/Setter Methods
    */
    my.colorScale = function(_) {
        if(!arguments.length) return colorScale;
        colorScale = _;
        return my;
      } // my.colorScale()
    ;
    my.grid = function(_) {
        if(!arguments.length) return grid;
        grid = _;
        return my;
      } // my.grid()
    ;
    my.container = function(_) {
        if(!arguments.length) return container;
        container = _;
        return my;
      } // my.container()
    ;
    my.connect = function (_){
        if(!arguments.length) return dispatch;
        dispatch = _;
        return my;
      } // my.connect()
    ;
    my.query = function (_){
        if(!arguments.length) return query;
        query = _;
        return my;
      } // my.query()
    ;
    my.toggleLegend = toggleLegend;

    /*
    ** This is ALWAYS the last thing returned
    */
    return my;
} // Tabulus()
