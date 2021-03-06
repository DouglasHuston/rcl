define([
        'config',
        'model',
        'backbone',
        'mustache',
        'jquery',
        'text!views/FindAChurch/Search.html'
        ], 
        function(config, model, Backbone, Mustache, $, template){

    return Backbone.View.extend({
        initialize: function(){
            _.bindAll(this, 'location_keyup', 'geocode', 'set_distance_unit_preference',
                'is_distance_unit_preference_set', 'get_distance_units', 'location_keyup')
            window.app.geocoder = new google.maps.Geocoder();
        },
        render: function(){
            this.$el.html(Mustache.render(template))
            
            // Attach search event handler to search button and text box
            $('.search').on('click', this.geocode)
            $('.location').on('keyup', this.location_keyup)
            $('.radius').on('change', this.geocode)
            $('.units').on('change', this.geocode)

        // Step 1:  Get a list of unique cgroup abbreviations out of the database, and display
        //  them in the filter control.
			var thiz = this;
			var cgroups = new model.CGroups();
			cgroups.fetch({success:function(){
    			var abbreviations = _.without(_.uniq(cgroups.pluck('abbreviation')),undefined);
    			// You can then display these unique cgroup abbreviations in the filter control.
    			_.each(abbreviations, function(abbreviation){
        			thiz.$('#group_filter div').append("<a href='#' id='cgroup-" + abbreviation + "'>" + abbreviation + "</a> ");
        			// 2.  Step 2:  Onclick of an abbreviation in the filter control, query the database
        			//   for congs which have that cgroup abbreviation, and display those congs in the map.
        			thiz.$('#cgroup-' + abbreviation).on( 'click', function(){
            			// So, load one cgroup collection in Backbone into the map.
            			var cgroup = cgroups.findWhere({abbreviation:abbreviation})
            			// START HERE TODO: Figure out the right syntax to actually
            			//   update thiz.collection and fire its change event.
            			//  Is reset the right method to call?  Is cgroup.get congregations the right syntax? Does it return any data?	
            			// After clicking on a filter, the error "Uncaught TypeErrpr: Cannot read property 'prototype' of undefined" appears.
            			cgroup.get('congregations').fetch({
							success:function(cgroup){
								thiz.collection.reset(cgroup.get('congregations'))
							}
           			 	})
   //      			 	thiz.collection = cgroup.get('congregations') //this should update the map automatically.
                 	})
  				});
			}})

            // TODO: Improve User Interface:
            // TODO: - Try to be able to guess which unit of distance (Mi or KM) they prefer based on 
            //  some input from the user.
            // TODO:   * Event Handler: On page load
			
            //If the distance unit preference is set,
			// set the distance units in the form based on what is in the preference.
			if ( this.is_distance_unit_preference_set() ){
				this.$('.units').val(localStorage['distance_units']);		
			}
            // TODO:     * Else, on page load, before the person searches, 
			else {
				// Guess what units they want based on one of the following:
                //            * First try the users' browser's geolocation information. If 
                //                  the user is in one of the countries that use miles, select "miles" in the form
                //                  and save it to the preference.

                var thiz=this

                if (navigator.geolocation){
                    // Center the map on the viewer's country by default
                    navigator.geolocation.getCurrentPosition(function(position){			
                        window.app.geocoder = new google.maps.Geocoder();
                        window.app.geocoder.geocode( { 'address': position.coords.latitude + "," + position.coords.longitude}, function(results, status) {
                        //	Underscore.js _.filter() method) for results[0].address_components[x].types.short_name == 'US'
                            if (status == google.maps.GeocoderStatus.OK){
                                // Set the user's location's country's distance units in the form
                                thiz.$('.units').val(thiz.get_distance_units(results))
                            }
                        })
                    })
                }else{
                    console.log("Geolocation is not supported by this browser.");
                    // TODO:   * Next, try the browser country or language setting.
//                     var userLang = navigator.language || navigator.browserLanguage || navigator.systemLanguage || navigator.userLanguage;
//                     console.log(userLang)
//                     // Determine if userLang contains a 2-character country code after a hyphen
//                     //  (e.g., userLang could equal 'en-US')
//                     var country_code = userLang.split('-')[1]
//                     var language_code = userLang.split('-')[0]
//                     if (country_code !== '' && typeof country_code !== 'undefined'){
// 						this.record_distance_units(country_code)
//                     }else{
//                         // Use the language code.  This might help:  http://download.geonames.org/export/dump/countryInfo.txt
//                         // These are the languages of the countries that use miles
//                         var languages = ['en', 'mm', 'bur', 'mya']
//                         // If the country's language is NOT in this set, then the country uses kilometers.
//                         if (languages.indexOf(language_code) === -1){
//                             localStorage('distance_units', 'km')
//                         }else{
//                             // If the country does use this language, then we don't know if it uses miles or kilometers.
//                         }
//                     }
//                     // TODO:   * Get their preference from their IP address
				    $.get("http://freegeoip.net/json",function(data,status){
						var country_code = data.country_code
						thiz.record_distance_units(country_code)
						
					});
						        			
                    
                    // Create the map
                    this.create_map({coords:this.default_map_center})
                }

			}
        },
        record_distance_units:function(country_code){
			// Test if this country code uses miles or kilometers.
			// TODO: Maybe these codes should be put into one data structure with the array used
			//  below (["United Kingdom", "Liberia", "Myanmar", "United States"]) so we don't 
			//  complicate future maintenance of the application.
			var country_codes = ['GB', 'LR', 'MM', 'US']
			// If country_code is in the list, then
			if (country_codes.indexOf(country_code) !== -1){
				// Record preference accordingly
				localStorage('distance_units', 'miles')
			}else{
				localStorage('distance_units', 'km')
				}
        	},
        
        
		is_distance_unit_preference_set:function(){
			// Get preference here
			localStorage['distance_units']
			if (typeof localStorage['distance_units'] === 'undefined'){
				return false;
			}else{
				return true
			}
		},
		set_distance_unit_preference:function(event){
			//  Set preference here
			localStorage['distance_units'] = this.$('.units').val();
			if (event.target === this.$(".units")) {
				loclalStorage['distance_units_manual'] = 'manual'
				//if a person selects the the distance, it becomes their preference
			}
			
		},
        location_keyup:function(event){
            if (event.which == 13){
                this.geocode(event)
            }
        },
		get_distance_units:function(results){
            var country_names_objects = _.filter(results[0].address_components, function(item){
            	//See if it contains countries that use miles (GB, LR, MM, US)
                return ["United Kingdom", "Liberia", "Myanmar", "United States"].indexOf(item.long_name) !== -1
			});
            country_names = _.chain(country_names_objects)
                .pluck('long_name')
                .filter(function(item){ return typeof item !== 'undefined'; })
                .value()
            if (country_names.length >0){
                output = 'miles'
            }else{
                output = 'km'
            }
            return output;
		},
        geocode: function (event){
            event.preventDefault()
            // If user submitted an address, put that address into this.model
            // Use location user entered

            // Convert radius*units to meters
            var radius = $('.radius').val(); 
            var units = $('.units').val();
            var distance;
            if (units == 'miles'){
                distance = radius * 1609.344;
            } else if (units == 'km') {
                distance = radius * 1000;
            }
            
			this.set_distance_unit_preference(event)

			
      
            // Geocode location
        	var thiz=this
            var location = $('.location').val()
            if (location == ''){
                location = thiz.model.get('location')
            }
            window.app.geocoder.geocode( { 'address': location}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    // Put the above variables into this.model in one action so there's only one change event
                    thiz.model.set({
                        location:location,
                        radius:radius,
                        distance:distance,
                        units:units,
                        results:results
                    })
					if (!thiz.is_distance_unit_preference_set() && localStorage['distance_units_manual'] !== 'manual'){
    				    // Try figuring the user's distance_unit preference based on the country in which they are searching.
						var distance_units = thiz.get_distance_units(results)
    					// Set the preference to contain 'miles' or 'km'
						var distance_units = thiz.get_distance_units(results)
						localStorage['distance_units'] = distance_units
                        // Set form to display the distance units of the country in which the user searched
                        thiz.$('.units').val(distance_units)
					}
                } else {
                    alert("Geocode was not successful for the following reason: " + status);
                }
            });
		}
    });
});
//TODO:  Figure out why after the above work to save the distance units preference, after typing an address in the location search box, there is an error in the JavaScript cntrols and the map does not center on that location.
