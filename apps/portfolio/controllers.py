"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/%7Bapp_name%7D/%7Bpath%7D

If app_name == '_default' then simply

    http://127.0.0.1:8000/%7Bpath%7D

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object
 
session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

import random
import string
from py4web import action, request, abort, redirect, URL
from yatl.helpers import A
from .common import db, session, T, cache, auth, logger, authenticated, unauthenticated, flash
from py4web.utils.url_signer import URLSigner
from .models import get_user_email
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.grid import Grid, GridClassStyleBulma

url_signer = URLSigner(session)

@action('index')
@action.uses('index.html', db, auth, url_signer)
def index():
    
    # Check the number of records in the species table
    species_count = db(db.species).count()
    print(f"Number of species in the database: {species_count}")

    # Fetch some species records and print them
    species = db(db.species).select(limitby=(0, 5))
    for s in species:
        print(f"Species: {s.name}")

    # Check the checklist table
    checklist_count = db(db.checklist).count()
    print(f"Number of checklists in the database: {checklist_count}")

    # Check the sightings table
    sightings_count = db(db.sighting).count()
    print(f"Number of sightings in the database: {sightings_count}")
    sightings = db(db.sighting).select(limitby=(0, 5))

    for s in sightings:
        print(f"Sighting checklist_id: {s.checklist_id}, species_id: {s.species_id}, count: {s.count}")
    # Fetch some checklist records
    
    checklists = db(db.checklist).select(limitby=(0, 5))
    for c in checklists:
        print(f"Checklist: {c.event_id}, Latitude: {c.latitude}, Longitude: {c.longitude}, Event ID: {c.event_id},")
    
    return dict(
        my_callback_url = URL('my_callback', signer=url_signer),
    )

@action('location')
@action.uses('location.html', db, auth.user, url_signer)
def location(): 
    return dict(
        my_callback_url = URL('my_callback', signer=url_signer),
        test_query_url = URL('test_query', signer=url_signer),
        get_all_sighting_LatLng_url = URL('get_all_sighting_LatLng', signer=url_signer),
        get_region_sightings_url = URL('get_region_sightings', signer=url_signer),
    )

@action('my_callback')
@action.uses() # Add here things like db, auth, etc.
def my_callback():
    # The return value should be a dictionary that will be sent as JSON.
    return dict(my_value=3)

@action('get_all_sighting_LatLng', method=["GET"])
@action.uses(db, auth.user)
def get_all_sighting_LatLng():
    latlng = db(db.checklist).select(db.checklist.latitude, db.checklist.longitude).as_list()
    return dict(latlng=latlng)

@action('get_region_sightings', method=["GET"])
@action.uses(db, auth.user)
def get_region_sightings():
    lat1 = request.params.get('lat1')
    lat2 = request.params.get('lat2')
    lng1 = request.params.get('lng1')
    lng2 = request.params.get('lng2')

    region_sightings = db(
        (db.sighting.species_id == db.species.id) &
        (db.sighting.checklist_id == db.checklist.id) &
        (db.checklist.latitude >= lat1) &
        (db.checklist.latitude <= lat2) & 
        (db.checklist.longitude >= lng1) &
        (db.checklist.longitude <= lng2)
    ).select(
        db.sighting.count,
        db.species.name,
        db.checklist.latitude,
        db.checklist.longitude,
        db.checklist.observer_id,
        db.checklist.observation_date
        ).as_list()
    
    return dict(region_sightings=region_sightings)

@action('stats')
@action("stats/<path:path>")
@action.uses('stats.html', db, session, auth)
def stats(path=None):
    # ----------------------Create a grid----------------------
    grid = Grid(
        path,
        query=(db.sighting.id > 0),
        fields=[
            db.sighting.id,
            db.checklist.observation_date,  # Display observation date from the checklist
            db.species.name,  # Display species name
            db.sighting.count,  # Display the count of birds seen
        ],
        left=[
            db.checklist.on(db.sighting.checklist_id == db.checklist.id),
            db.species.on(db.sighting.species_id == db.species.id),
        ],
        search_queries=[
            ("By Species", lambda value: db.species.name.contains(value)),
        ],
        editable=False,
        deletable=False,
        details=False,
        create=False,
        grid_class_style=GridClassStyleBulma,
        formstyle=FormStyleBulma,
    )
    return dict(
        grid=grid,
        my_callback_url=URL('my_callback', signer=url_signer),
        load_checklist_data_url=URL('load_checklist_data'),
        fetch_coordinates_url=URL('fetch_coordinates'),
        bird_trends_url=URL('bird_trends'),
        )


    # ----------------------Load google maps data----------------------------
@action('load_checklist_data')
@action.uses(db)  # Ensure this function returns JSON
def load_checklist_data():
    # Fetch checklist data along with related sighting information
    sightings_count = db(db.sighting.id > 0).count()
    checklist_data = db(
        (db.checklist.latitude != None) & (db.checklist.id == db.sighting.checklist_id)
    ).select(
        db.checklist.latitude,
        db.checklist.longitude,
    ).as_list()

    # Fetch unique species from the species table
    species_data = db(db.species.id > 0).select(db.species.name, distinct=True).as_list()

    print("Fetched checklist data:", len(checklist_data), "records")
    print("First 10 records of checklist data:", checklist_data[:10])
    print("Fetched species data:", len(species_data), "records")
    print("First 10 species:", species_data[:10])

    # Return both checklist data and species data
    return dict(
        sightings_count=sightings_count,
        checklist_data=checklist_data,
        species_data=[species['name'] for species in species_data]  # Return a list of unique species names
    )

# ----------------------Fetch Coordinates----------------------------
@action('fetch_coordinates')
@action.uses(db)  # Ensure the function can interact with the database
def fetch_coordinates():
    species_name = request.params.get("species")

    if not species_name:
        return dict(coordinates=[])

    # Fetch latitude and longitude for the given species
    coordinates = db(
        (db.species.name == species_name) & 
        (db.sighting.species_id == db.species.id) & 
        (db.sighting.checklist_id == db.checklist.id)
    ).select(
        db.checklist.latitude,
        db.checklist.longitude
    ).as_list()

    return dict(coordinates=coordinates)

# ----------------------Bird Trends----------------------------
@action('bird_trends')
@action.uses(db)
def bird_trends():
    # Query the database to get the count of checklists per observation_date
    data = db(
        db.checklist.id > 0
    ).select(
        db.checklist.observation_date,
        db.checklist.id.count().with_alias('obs_count'),
        groupby=db.checklist.observation_date,
        orderby=db.checklist.observation_date
    )

    # Extract dates and counts into lists
    dates = [str(row.checklist.observation_date) for row in data]
    counts = [row.obs_count for row in data]

    return dict(dates=dates, counts=counts)



# ---------------------- Checklists Branch ----------------------

def generate_unique_event_id():
    random_part = ''.join(random.choices(string.digits, k=8))
    return f"S{random_part}"

@action('checklists', method='GET')
@action.uses('checklists.html', db, auth.user, session, T)
def check():
    return dict(user=auth.get_user())
    
@action('mychecklists', method='GET')
@action.uses('my_checklists.html', db, auth.user, session, T)
def my_checklists():
    return dict(user=auth.get_user())

@action('api/get_species', method='GET')
@action.uses(db)
def get_species():
    rows = db(db.species.id > 0).select()
    species_list = [{"id": r.id, "name": r.name} for r in rows]
    return dict(species=species_list)


@action('api/add_checklist', method='POST')
@action.uses(db, auth.user)
def add_checklist():
    user = auth.get_user()
    if not user:
        return dict(status="error", message="User not logged in")

    data = request.json
    if not data:
        return dict(status="error", message="No data provided")

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    observation_date = data.get('observation_date')
    observation_time = data.get('observation_time')
    duration_minutes = data.get('duration_minutes', 0)

    if not (latitude and longitude and observation_date and observation_time):
        return dict(status="error", message="Missing required parameters")

    try:
        latitude = float(latitude)
        longitude = float(longitude)
        duration_minutes = int(duration_minutes)
    except ValueError:
        return dict(status="error", message="Invalid numeric values")

    event_id = generate_unique_event_id()
    while db(db.checklist.event_id == event_id).count() > 0:
        event_id = generate_unique_event_id()

    observer_id = user.get('id')
    checklist_id = db.checklist.insert(
        event_id=event_id,
        latitude=latitude,
        longitude=longitude,
        observation_date=observation_date,
        observation_time=observation_time,
        observer_id=observer_id,
        duration_minutes=duration_minutes
    )

    return dict(status="success", event_id=event_id, checklist_id=checklist_id)


@action('api/update_sightings', method='POST')
@action.uses(db, auth.user)
def update_sightings():
    user = auth.get_user()
    if not user:
        return dict(status="error", message="User not logged in")

    data = request.json or {}
    event_id = data.get('event_id')
    sightings_data = data.get('sightings', [])

    if not event_id:
        return dict(status="error", message="event_id is required")

    checklist_row = db(db.checklist.event_id == event_id).select().first()
    if not checklist_row:
        return dict(status="error", message="Checklist not found")

    checklist_id = checklist_row.id

    # Clear existing sightings
    db(db.sighting.checklist_id == checklist_id).delete()

    for sight in sightings_data:
        species_name = sight.get('species_name')
        count = sight.get('count', 0)
        species_row = db(db.species.name == species_name).select().first()
        if not species_row:
            # Skip if species not found
            continue

        db.sighting.insert(
            checklist_id=checklist_id,
            species_id=species_row.id,
            count=int(count)
        )

    return dict(status="success")


# Additional endpoints for managing and viewing checklists:

@action('api/get_checklist_details', method='GET')
@action.uses(db, auth.user)
def get_checklist_details():
    user = auth.get_user()
    event_id = request.GET.get('event_id')
    if not user:
        return dict(status="error", message="User not logged in")
    if not event_id:
        return dict(status="error", message="No event_id provided")

    # Get the checklist row
    checklist_row = db((db.checklist.event_id == event_id) & 
                       (db.checklist.observer_id == user['id'])).select().first()
    if not checklist_row:
        return dict(status="error", message="Checklist not found or not yours")

    return dict(
        status="success",
        details={
            "latitude": checklist_row.latitude,
            "longitude": checklist_row.longitude,
            "observation_date": str(checklist_row.observation_date),
            "observation_time": str(checklist_row.observation_time),
            "duration_minutes": checklist_row.duration_minutes
        }
    )


@action('api/update_checklist', method='POST')
@action.uses(db, auth.user)
def update_checklist():
    user = auth.get_user()
    if not user:
        return dict(status="error", message="User not logged in")

    data = request.json
    event_id = data.get('event_id')
    if not event_id:
        return dict(status="error", message="No event_id provided")

    # Get updated fields
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    observation_date = data.get('observation_date')
    observation_time = data.get('observation_time')
    duration_minutes = data.get('duration_minutes', 0)

    if not (latitude and longitude and observation_date and observation_time):
        return dict(status="error", message="Missing required parameters")

    try:
        latitude = float(latitude)
        longitude = float(longitude)
        duration_minutes = int(duration_minutes)
    except ValueError:
        return dict(status="error", message="Invalid numeric values")

    # Find the existing checklist
    checklist = db((db.checklist.event_id == event_id) & (db.checklist.observer_id == user['id'])).select().first()
    if not checklist:
        return dict(status="error", message="Checklist not found or not yours")

    # Update the checklist fields
    checklist.update_record(
        latitude=latitude,
        longitude=longitude,
        observation_date=observation_date,
        observation_time=observation_time,
        duration_minutes=duration_minutes
    )
    db.commit()

    return dict(status="success")



@action('api/get_user_checklists', method='GET')
@action.uses(db, auth.user)
def get_user_checklists():
    user = auth.get_user()
    if not user:
        return dict(status="error", message="User not logged in")

    rows = db(db.checklist.observer_id == user['id']).select()
    checklists = []
    for r in rows:
        checklists.append({
            "id": r.id,
            "event_id": r.event_id,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "observation_date": str(r.observation_date),
            "observation_time": str(r.observation_time),
            "duration_minutes": r.duration_minutes
        })
    return dict(status="success", checklists=checklists)


@action('api/delete_checklist', method='POST')
@action.uses(db, auth.user)
def delete_checklist():
    user = auth.get_user()
    if not user:
        return dict(status="error", message="User not logged in")

    data = request.json
    event_id = data.get('event_id')
    if not event_id:
        return dict(status="error", message="No event_id provided")

    checklist_row = db((db.checklist.event_id == event_id) & 
                       (db.checklist.observer_id == user['id'])).select().first()
    if not checklist_row:
        return dict(status="error", message="Checklist not found or not yours")

    # Delete sightings first
    db(db.sighting.checklist_id == checklist_row.id).delete()
    db(db.checklist.id == checklist_row.id).delete()
    return dict(status="success")


@action('api/get_checklist_sightings', method='GET')
@action.uses(db, auth.user)
def get_checklist_sightings():
    # Used if we want to edit an existing checklist
    user = auth.get_user()
    event_id = request.GET.get('event_id')
    if not user:
        return dict(status="error", message="User not logged in")
    if not event_id:
        return dict(status="error", message="No event_id provided")

    checklist_row = db((db.checklist.event_id == event_id) & 
                       (db.checklist.observer_id == user['id'])).select().first()
    if not checklist_row:
        return dict(status="error", message="Checklist not found or not yours")

    sightings = db(db.sighting.checklist_id == checklist_row.id).select()
    results = []
    for s in sightings:
        species_name = db.species[s.species_id].name
        results.append({
            "species_name": species_name,
            "count": s.count
        })

    return dict(status="success", sightings=results)
