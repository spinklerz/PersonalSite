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
            userRegion: { lat: 40.0, lng: -100.0 },
            markers: []
        };
    },
    methods: {
        loadData() {
            axios.get(my_callback_url).then((r) => {
                this.my_value = r.data.my_value;
            });
        },

        initMap() {
            this.map = new google.maps.Map(document.getElementById('map'), {
                center: this.userRegion,
                zoom: 5
            });

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
            });
        },

        loadSpeciesList() {
            fetch('/bird_watching/static/sample_data/species.csv')
                .then(response => response.text())
                .then(data => {
                    const lines = data.trim().split('\n');
                    this.speciesList = lines;
                    this.selectedSpecies = this.speciesList.length > 0 ? this.speciesList[0] : "";
                })
                .catch(error => {
                    console.error('Error fetching species list:', error);
                });
        },

        fetchDensityData() {
            console.log("Fetching density data for species:", this.selectedSpecies);
            if (!this.selectedSpecies) return;

            Promise.all([
                fetch('/bird_watching/static/sample_data/sightings.csv').then(r => r.text()),
                fetch('/bird_watching/static/sample_data/checklists.csv').then(r => r.text())
            ]).then(([sightingsData, checklistsData]) => {
                const sightingsLines = sightingsData.trim().split('\n');
                const sightingsHeader = sightingsLines.shift().split(',');
                const commonNameIndex = sightingsHeader.indexOf('COMMON NAME');
                const eventIdIndex = sightingsHeader.indexOf('SAMPLING EVENT IDENTIFIER');

                const filteredSightings = sightingsLines.map(line => line.split(','))
                    .filter(cols => cols[commonNameIndex] === this.selectedSpecies);

                const eventIds = new Set(filteredSightings.map(cols => cols[eventIdIndex]));

                const checklistLines = checklistsData.trim().split('\n');
                const checklistHeader = checklistLines.shift().split(',');
                const checklistEventIdIndex = checklistHeader.indexOf('SAMPLING EVENT IDENTIFIER');
                const latIndex = checklistHeader.indexOf('LATITUDE');
                const lngIndex = checklistHeader.indexOf('LONGITUDE');

                this.clearMarkers();

                checklistLines.map(line => line.split(','))
                    .filter(cols => eventIds.has(cols[checklistEventIdIndex]))
                    .forEach(cols => {
                        const lat = parseFloat(cols[latIndex]);
                        const lng = parseFloat(cols[lngIndex]);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            const marker = new google.maps.Marker({
                                position: { lat: lat, lng: lng },
                                map: this.map,
                                title: `${this.selectedSpecies}`
                            });
                            this.markers.push(marker);
                        }
                    });
            }).catch(error => {
                console.error('Error fetching density data:', error);
            });
        },

        showAllBirdDensities() {
            Promise.all([
                fetch('/bird_watching/static/sample_data/sightings.csv').then(r => r.text()),
                fetch('/bird_watching/static/sample_data/checklists.csv').then(r => r.text())
            ]).then(([sightingsData, checklistsData]) => {
                const checklistLines = checklistsData.trim().split('\n');
                const checklistHeader = checklistLines.shift().split(',');
                const checklistEventIdIndex = checklistHeader.indexOf('SAMPLING EVENT IDENTIFIER');
                const latIndex = checklistHeader.indexOf('LATITUDE');
                const lngIndex = checklistHeader.indexOf('LONGITUDE');

                this.clearMarkers();

                checklistLines.forEach(line => {
                    const cols = line.split(',');
                    const lat = parseFloat(cols[latIndex]);
                    const lng = parseFloat(cols[lngIndex]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        const marker = new google.maps.Marker({
                            position: { lat: lat, lng: lng },
                            map: this.map,
                            title: "Bird sighting"
                        });
                        this.markers.push(marker);
                    }
                });

            }).catch(error => {
                console.error('Error fetching all bird densities:', error);
            });
        },

        clearMarkers() {
            if (this.markers && this.markers.length > 0) {
                this.markers.forEach(marker => marker.setMap(null));
            }
            this.markers = [];
        },

        goToChecklist() {
            window.location.href = "/checklist";
        },

        goToStats() {
            window.location.href = "/stats";
        },

        goToRegionStats() {
            if (!this.rectangleBounds) return;
            const NE = this.rectangleBounds.getNorthEast();
            const SW = this.rectangleBounds.getSouthWest();
            const query = `?nelat=${NE.lat()}&nelng=${NE.lng()}&swlat=${SW.lat()}&swlng=${SW.lng()}`;
            window.location.href = "/location" + query;
        },
    },

    mounted() {
        this.loadData();
        this.loadSpeciesList();
        this.initMap();

        this.showAllBirdDensities();
    }
};

let vueApp = Vue.createApp(app.data).mount("#app");
