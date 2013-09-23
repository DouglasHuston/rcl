define([
        'config',
        'mustache',
		'backbone',
        'backgrid'
        ], 
        function(config, Mustache, Backbone, Backgrid){

    return Backbone.View.extend({
        initialize: function(){
        },
        render: function(){
            // TODO: render() is being called twice!
            Backgrid.CitystateCell = Backgrid.Cell.extend({
                className: "citystate-cell",
                formatter: Backgrid.StringFormatter,
                render:function(){
                    var model = this.model
                    this.$el.val(model.get('meeting_city') + ', ' + model.get('meeting_state'));
                    return this;
                }
            });
            Backgrid.ContactinfoCell = Backgrid.Cell.extend({
                className: "contactinfo-cell",
                formatter: Backgrid.StringFormatter,
                render:function(){
                    var model = this.model
                    this.$el.val(model.get('contact_type') + model.get('contact_name') + 
                        '<br />' + model.get('phone') + '<br />' + model.get('website'));
                    return this;
                }
            });
            // Declare Backgrid columns
            var columns = [{
                name: "name",
                label: "Name",
                cell: "string",
                editable: false
            }, {
                name: "city_state",
                label: "City, State",
                cell: 'citystate',
                editable: false
            }, {
                name: "contact_info",
                label: "Contact info",
                cell: 'contactinfo',
                editable: false
            }];
            
            // Initialize a new Grid instance
            var grid = new Backgrid.Grid({
                columns: columns,
                collection: this.collection
            });
            
            // TODO: For some reason this isn't rendering to the DOM
            // Render the grid and attach the root to the HTML document
            this.$el.append(grid.render().$el);
            
        }
    });
});