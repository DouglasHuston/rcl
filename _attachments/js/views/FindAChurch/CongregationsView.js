define([
        'config',
        "text!views/FindAChurch/congregations.html"
        ], 
        function(config,template){

    return Backbone.View.extend({
        initialize: function(){
        },
        render: function(){
            this.$el.html(Mustache.render(template))
            // Apply tablesorter widget to table containing congregation list
            $("#congregation_list")
            .tablesorter({widgets: ['zebra'], locale: 'us', useUI: true});
            // TODO: For some reason the pager doesn't display, its div wraps around the table and filter widgets,
            //       and it breaks the sorter so when you click on the table header the rows disappear.
            //.tablesorterPager({container: $("#pager")});
            // https://blueprints.launchpad.net/reformedchurcheslocator/+spec/get-tablesorter-pager-to-display
        }
    });
});