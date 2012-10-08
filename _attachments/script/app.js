// Define require() from require.js using the standard AMD define
define(['model', 'async!https://maps.googleapis.com/maps/api/js?sensor=false',
        'lib/jquery.couchLogin'], function(model){
    
    var path = unescape(document.location.pathname).split('/'),
        db = $.couch.db(path[1]);
    $("#account").couchLogin({});
   
    // TODO: Put custom evently code here
    
    // Evently version
    // TODO: Migrate these Evently widgets to Backbone views
    $.couch.app(function(app) {
        $("#mainmenu").evently("mainmenu", app);
        $("#map").evently("map", app);
        $("#search_container").evently("search", app);
    });

    // ------------------------------------------------------------------
    // Backbone version
    // ------------------------------------------------------------------
    
    // TODO: This should probably go into a configuration file
    // Enables Mustache.js-like templating.
    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };

    // Example of how to save a many-to-many relation to the database
    // Instantiate group of congs
    congs = new model.Congs
    // Instantiate congregation model
    // TODO: Should this be global or not?
    cong1 = congs.create({
        name:'Caney OPC',
        mailing_state:'KS'
    })
    // Save congregation model so we can get its _id
    cong1.save({}, {success:function(){
        // Instantiate second congregation model
        cong2 = congs.create({
            name:'Bartlesville OPC',
            mailing_state:'OK'
        })
        // Save second congregation model so we can get its _id
        cong2.save({},{success:function(){
            // Create CGroup model and add congregations to it
            OPC = new model.CGroup({
                name:'Orthodox Presbyterian Church',
                abbreviation:'OPC'
            })
            // Add congregations to cgroup
            OPC.get('congregations').add({_id:cong1.get('_id')})
            OPC.get('congregations').add({_id:cong2.get('_id')})
            
            // Save CGroup model to the database so we can get its _id
            OPC.save({}, {success:function(){
                // Add cgroup to congs' cgroups
                // TODO: This isn't working
                // Note that one reason might be that it isn't created the same way OPC is above,
                //  but adding congregations to OPC is working.
                cong1.get('cgroups').add({_id:OPC.get('_id')})
//              console.log(cong1.get('cgroups'))
                console.log(cong1)
//                // TODO: This isn't working either
//                $.each([cong1,cong2], function(key, cong){
//                    cong.get('cgroups').add({_id:OPC.get('_id')})
//                    cong.save()
//                })
            }});
        }})
    }})
    // TODO: Figure out the syntax for restoring many-to-many relations from the database 
    // TODO: Figure out the syntax for querying via relations in the database.
    //  It appears to be by creating a collection whose url points to a CouchDB view,
    //  then querying (an instance of) that collection using CouchDB query options
    // Note:  Just instantiating a new Collection like this populates it from the db,
    //  which may be all we need to do, if the relations are recorded properly above.
    //  Or we may have to call .fetch() on each relationship's collection.
    congs2 = new model.Congs
    
    // TODO: Create Backbone views here
    // TODO: Move views into separate files when they get too numerous here
    //  This tutorial shows how to use RequireJS with Backbone:
    //  http://backbonetutorials.com/organizing-backbone-using-modules/
    MapView = Backbone.View.extend({
        initialize: function(){
            this.render();

        	// TODO: Migrate the code below into Backbone events
        	
        	// Attach events to search_the_map form elements
        	$('#search').click(function() {
        		codeAddress();
        		return false;
        	});
        	$('#search_the_map').keypress(function(event) {
        		if (event.which==13){ // The user pressed the enter key
        			event.preventDefault();  // Prevent the default action of submitting the form
        			codeAddress();
        			return false; // This might help some browsers avoid submitting the form
        		}
        	});
        },
        render: function(){
            var template = _.template( $("#map_template").html(), {} );
            $(this.el).html( template );
            // Initialize Google map
            // TODO: We are trying to get the AJAX request to work on the "on key up" event; but no luck so far. 
            var geocoder;
            var map;
            function initialize() {
                geocoder = new google.maps.Geocoder();
                // TODO: Center the map on the viewer's country
                var latlng = new google.maps.LatLng(-34.397, 150.644);
                var myOptions = {
                        zoom: 8,
                        center: latlng,
                        mapTypeId: google.maps.MapTypeId.ROADMAP
                }
                map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
            }
            initialize();
        },
        events: {
            "click #mainmenu >li>a[href=#map]": "map"
        },
        // TODO: make a view that contains the whole map page
        map: function( event ){
            // Button clicked, you can access the element that was clicked with event.currentTarget
        	// TODO: Load the map view
            alert( "Search for " + $("#search_input").val() );
        }
    });
    // TODO: Move form elements into Menu view
    //  - Copy above view to below
    //  - in initialize:  Delete all but this.render();
    //  - Create a template section (in <script></script> tags) in index.html, and paste in 
    //      the form element code currently found higher up in index.html
    //  - in render:  Delete all but the first two lines, then modify the first two lines to
    //      reference a container div with the correct ID
    //  - in doSearch:  Find our existing code that handles the "change" event in the 
    //      input & select elements, put it into doSearch, rename doSearch to appropriately describe
    //      that code, then modify the events: section above to call that doSearch function when
    //      the change event happens in the input & select boxes
    //  - Instantiate this new view in a variable below. 
    MenuView = Backbone.View.extend({
        initialize: function(){
            this.render();
        },
        render: function(){
        	var template = _.template( $("#menu_template").html(), {} );
            $(this.el).html( template );
        },
        events: {
            "click input[type=button]": "doSearch"
        },
  // TODO: one function per menu item
        doSearch: function( event ){
            // Button clicked, you can access the element that was clicked with event.currentTarget
            alert( "Search for " + $("#search_input").val() );
        }
    });
    
    SearchView = Backbone.View.extend({
        initialize: function(){
            this.render();
        },
        render: function(){
            var template = _.template( $("#search_template").html(), {} );
            $(this.el).html( template );
        },
        events: {
            "click #search": "doSearch"
        },
        doSearch: function( event ){
        	var address = document.getElementById("search_the_map").value;
        	geocoder.geocode( { 'address': address}, function(results, status) {
        		if (status == google.maps.GeocoderStatus.OK) {
        			// Use Circle() as a helper to avoid doing math. 
        			// Convert radius*units to meters
        			var radius = $('#radius').val(); 
        			var units = $('#units').val();
        			if (units == 'miles'){
        				var distance = radius * 1609.344;
        			} else if (units == 'km') {
        				var distance = radius * 1000;
        			}
        			// Create an instance of Circle() with the selected radius
        			var loc = results[0].geometry.location;
        			var center = new google.maps.LatLng(loc.lat(), loc.lng());
        			var circle = new google.maps.Circle({radius: distance, center: center}); 
        			// Center and zoom the map to the bounds of the circle. 
        			map.setCenter(loc);
        			map.fitBounds(circle.getBounds()); // this sets the zoom 
        			// mapbounds contains an array containing two lat/lng pairs in this order:
        			// (south bottom 36, west left -96)
        			// (north top 37, east right -95)
        			var mapbounds = circle.getBounds();
        			var north_east = mapbounds.getNorthEast();
        			var south_west = mapbounds.getSouthWest();

        			var west_lng = south_west.lng();
        			var east_lng = north_east.lng();
        			var north_lat = north_east.lat();
        			var south_lat = south_west.lat();

        			// Send AJAX call to controller method containing bounds within which congregations are found
        			// So we can search like this:  cong_lat > south_lat and cong_lat < north_lat and cong_lng > west_lng and cong_lng < east_lng
        			// TODO: Create codes go getcongsinbounds
        			$.ajax({
        				url: "/cong/getcongsinbounds",
        				data: {
        					west_lng:	west_lng,
        					east_lng:	east_lng,
        					north_lat:	north_lat,
        					south_lat:	south_lat
        				},
        				success: function(data){
        					var congs = data['congs'];
        					if (congs.length > 0){
        						// Plot the congregations returned on the map
        						function close_infowindows() {
        							for (var i2=0; i2<infowindows.length; i2++){
        								infowindows[i2].close(map,marker);
        							}
        						}

        						// Remove existing table rows that contain congregation data (don't remove the header row)
        						$("#congregation_list tbody tr").remove();

        						var infowindows = [];
        						for (var i=0; i<congs.length; i++){
        							var point = new google.maps.LatLng(congs[i].lat, congs[i].lng);
        							var marker = new google.maps.Marker({
        								position: point,
        								map: map,
        								title: congs[i].name
        							});
        							// TODO: Make it so the city entered has a different color than results 
        							//	found and/or the results entered have an "A,B,C" feature on the pinpoint.

        							// TODO: Figure out what address formats we need to parse before sending address to Google.
        							// TODO: Figure out which line(s) (address1 or address2) is needed to send to Google.
        							// Name:	Caney OPC
        							// Add1:	CVHS Gym
        							// Add2:	300 A St <-- We need this, not addr1

        							// Name:	Caney OPC
        							// Add1:	YMCA
        							// Add2:	500 S Green St. Room 12 <-- We need this, not addr1


        							var contentString = '' +
        							'<h4 style="margin: 0">' + congs[i].name + '</h4>' +
        							'<p>' + 
        							congs[i].meeting_address1 + "<br />" + 
        							( congs[i].meeting_address2 ? congs[i].meeting_address2 + "<br />" : '' ) + 
        							congs[i].meeting_city + ", " + 
        							congs[i].meeting_state + " " + 
        							congs[i].meeting_zip + "<br />" +
        							( congs[i].phone ? congs[i].phone + "<br />" : '' ) +
        							( congs[i].website ? '<a href="http://' + congs[i].website +'">' + congs[i].website + "</a><br />" : '' ) +
        							'</p>' +
        							'<form action="http://maps.google.com/maps" method="get" target="_blank">' +
        							'Enter your starting address:' +
        							'<input type="text" name="saddr" />' +
        							'<input type="hidden" name="daddr" value="' +
        							congs[i].meeting_address1 + ', ' + 
        							congs[i].meeting_city + ", " + 
        							congs[i].meeting_state + " " + 
        							congs[i].meeting_zip + " " +
        							"(" + congs[i].name + ")" +
        							'" />' +
        							'<input type="submit" value="get directions" />' +
        							'</form>' ;


        							// Create infowindow							  
        							var infowindow = new google.maps.InfoWindow({
        								content: contentString,
        								maxWidth: 300
        							});
        							//$(document['#infowindow'+i]).parent.style = 'overflow-y:hidden';
        							// Add the infowindow as an attribute of this marker to make it accessible within marker events.
        							marker.infowindow = infowindow;
        							// Add the infowindow to an array so we can close all infowindows from the events below.
        							infowindows[i] = infowindow;
        							// Add infowindow to map
        							google.maps.event.addListener(marker, 'click', function() {
        								close_infowindows();
        								this.infowindow.open(map,this);
        							});
        							// Close all infowindows when user clicks on map
        							google.maps.event.addListener(map, 'click', function() {
        								close_infowindows();
        							});

        							//TODO: Add congregation info to the table below the map.
        							// Construct the table rows that we're going to append to the table

        							var msg="<tr>" +
        							"<td><a href='/cong/" + congs[i].id + "'>" + congs[i].name + "</a></td>"+
        							"<td>" + congs[i].meeting_city + ", " + congs[i].meeting_state + ", " + congs[i].meeting_country + "</td>" +
        							"<td>" +(congs[i].phone ? congs[i].phone + "<br />": "" ) + 
        							(congs[i].email ? "<a href='mailto:" + congs[i].email + "'>" + congs[i].email + "</a><br />": "" ) + 
        							(congs[i].website ? "<a href='http://" + congs[i].website + "'>" + congs[i].website + "</a>": "") + 
        							"</td>" + 
        							"</tr>"; 


        							// Append the new table rows to the table
        							$("#congregation_list tbody").append(msg);
        						}
        					}
        				}
        			});
        		} else {
        			alert("Geocode was not successful for the following reason: " + status);
        		}
        	});
        	}
    });
    

    // TODO: Should this view initialization be done in the App below?
    var map_view = new MapView({ el: $("#map") });
    var search_view = new SearchView({ el: $("#search_container") });
    
    // TODO: Create main application
    var App = Backbone.Router.extend({
      initialize : function(){
          // TODO: Set up URLs here
      }
    });
    // TODO: Call App() and other views if necessary
});