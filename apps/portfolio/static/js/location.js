"use strict";

let app = {};

app.data = {
    data() {
        return {
            my_value: 1,
            speciesList: [],
            selectedSpecies: "",
            map: null,
            drawingManager: null,
            rectangle: null,
            rectangleBounds: null,
            userRegion: {},
            region_sightings: [{}],
            region_sighting_counts: {},
            top_contributing_users: [],
            loading: false,
        };
    },
    methods: {
        loadData() {
        },
        

        /**
         * Get user geolocation and initialize map properties.
         */
        initMap() {

            let userLocation = { lat: 40.0, lng: -100.0 };

            // Get user's location if available
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.drawMap(userLocation);
                }, () => {
                    this.drawMap(userLocation);
                });
            } 
            else {
                this.drawMap(userLocation);
            }
        
        },


        /**
         * Draw the map with the given location.
         * Initialize the drawing manager and heatmap.
         * @param {google.maps.LatLng|Object} location 
         */
        async drawMap(location) {

            this.map = new google.maps.Map(document.getElementById('map'), {
                center: location,
                zoom: 8,
            });

            this.initDrawingManager();
            this.initDefaultRectangle(location);
            this.initRectEventListener();
            this.initHeatMap();
            this.loadRegionSightings().then(() => {
                if (this.region_sightings.length > 0) {
                    const firstSpeciesName = this.region_sightings[0].species.name;
                    this.createSightingsChart(firstSpeciesName);
                }
            });
        },


        /**
         * Initialize the Drawing Manager to draw rectangle overlay on map.
         */
        initDrawingManager() {

            // Note: Drawing Manager initialization code borrowed from Nick Powell.
            this.drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: ['rectangle']
                },
                rectangleOptions: {
                    editable: true,
                    draggable: true
                }
            });
            this.drawingManager.setMap(this.map);
        },

        /**
         * Draw a default rectangle overlay on the map on page load.
         * @param {*} The default location to center the rectangle.
         */
        initDefaultRectangle(location) {

            this.rectangle = new google.maps.Rectangle({
            bounds: {
                north: location.lat + 0.2,
                south: location.lat - 0.2,
                east: location.lng + 0.4,
                west: location.lng - 0.4,
                },
            editable: true,
            draggable: true
            });

            this.rectangle.setMap(this.map);
            this.rectangleBounds = this.rectangle.getBounds();
            google.maps.event.addListener(this.rectangle, 'bounds_changed', () => {
                this.rectangleBounds = this.rectangle.getBounds();
            });
        },


        /**
         * Initialize event listener for rectangle and updating rectangle bounds.
         */
        initRectEventListener() {

            google.maps.event.addListener(this.drawingManager, 'overlaycomplete', (event) => {
                if (this.rectangle) {
                    this.rectangle.setMap(null);
                }
                if (event.type === 'rectangle') {
                    this.rectangle = event.overlay;
                    this.rectangleBounds = this.rectangle.getBounds();
                    google.maps.event.addListener(this.rectangle, 'bounds_changed', () => {
                        this.rectangleBounds = this.rectangle.getBounds();
                    });

                }
                this.drawingManager.setDrawingMode(null);
            });
        },


        /**
         * Get sighting Lat/Lng data and initialize heatmap layer.
         */
        async initHeatMap() {

            try {
                let sightingsLatLng = await this.loadSightingsLatLng();
                let heatmap = new google.maps.visualization.HeatmapLayer({
                    data: sightingsLatLng,
                });

                heatmap.setMap(this.map);
            }
            catch (error) {
                console.error('Error initializing heatmap layer:', error);
            }
        },


        /**
         * 
         * @returns {Promise<google.maps.LatLng[]>} List of LatLng objects of all sightings.
         */
        async loadSightingsLatLng() {
            
            let checklistLatLng = [];

            try {
                let res = await axios.get(get_all_sighting_LatLng_url);
                let latlng = res.data.latlng;
                for (let l of latlng) {
                    checklistLatLng.push(
                        new google.maps.LatLng(l.latitude, l.longitude)
                    );
                }
            } 
            catch (error) {
                console.error('Error fetching latlng data:', error);
            }
            return checklistLatLng;
        },

        /**
         * Fetch region sightings based on bounds of drawn rectangle overlay.
        */
        async loadRegionSightings() {

            this.loading = true;
            try {
                let res = await axios.get(get_region_sightings_url, {
                    params: {
                        lat1: this.rectangleBounds.getSouthWest().lat(),
                        lat2: this.rectangleBounds.getNorthEast().lat(),
                        lng1: this.rectangleBounds.getSouthWest().lng(),
                        lng2: this.rectangleBounds.getNorthEast().lng()
                    }
                });
                this.region_sightings = res.data.region_sightings;
                this.region_sighting_counts = this.sumSightingCounts();
                this.top_contributing_users = this.sumUserContributions();
            }
            catch(error) {
                console.error('Error fetching region sightings:', error);
            }
            finally {
                this.loading = false;
            }
        },

        /**
         * Sums the number of checklists and sightings for each species in the region.
         * @returns {Object} Object with species name as key and region checklist and sighting count as values.
         */
        sumSightingCounts() {

            let sighting_count = {};

            for (let sighting of this.region_sightings) {
                let speciesName = sighting.species?.name;

                if (!sighting_count[speciesName]) {
                    sighting_count[speciesName] = {
                    region_checklist_count: 0,
                    region_sighting_count: 0
                    }
                }
                sighting_count[speciesName].region_checklist_count += 1;
                sighting_count[speciesName].region_sighting_count += sighting.sighting?.count || 0;
            }
            return sighting_count;
        },

        /**
         * Sums the number of sightings for each user in the region.
         * @returns {Object[]} List of user contributions ordered by number of sightings.
         */
        sumUserContributions() {
            let userContributions = {};
        
            for (let sighting of this.region_sightings) {
                let user = sighting.checklist?.observer_id;
        
                if (user) {
                    if (!userContributions[user]) {
                        userContributions[user] = {
                            observer_id: user,
                            sightings: 0,
                        }
                    }
                    userContributions[user].sightings += 1;
                }
            }
        
            let userContributionsOrdered = Object.values(userContributions);
            userContributionsOrdered.sort((a, b) => b.sightings - a.sightings);
            console.log('userContributions:', userContributionsOrdered);
            
            return userContributionsOrdered;
        },

        /**
         * Displays species sightings over time in a line chart.
         * @param {*} The species to display on the chart.
         */
        async createSightingsChart(species) {

            // Filter sightings to selected species
            let speciesSightings = this.region_sightings.filter(sighting => sighting.species && sighting.species.name === species);
        
            // Sort sightings by date
            speciesSightings.sort((a, b) => new Date(a.checklist.observation_date) - new Date(b.checklist.observation_date));
        
            let labels = speciesSightings.map(sighting => sighting.checklist.observation_date);
            let values = speciesSightings.map(sighting => sighting.sighting.count);

            // Cumulative sum of sightings
            for (let i = 1; i < values.length; i++) {
                values[i] += values[i - 1];
            }
            
            let ctx = document.getElementById('sightingsChart').getContext('2d');
            if (this.sightingsChart) {
                this.sightingsChart.destroy();
            }
            this.sightingsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: false,
                        data: values,
                        backgroundColor: 'rgba(75, 192, 75, 0.2)',
                        borderColor: 'rgba(75, 192, 75, 1)',
                        borderWidth: 1,
                        tension: 0.5, 
                        // pointBackgroundColor: 'rgba(75, 192, 75, 1)',
                        // pointBorderColor: 'rgba(75, 192, 75, 1)',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                maxTicksLimit: 10
                            }
                        },
                        y: {
                            beginAtZero: false,
                            ticks: {
                                stepSize: 1
                            },
                        }
                    }, 
                },
            });
        },
        
        
    },

    mounted() {
        this.loadData();
    },
}

let vueApp = Vue.createApp(app.data).mount("#app");