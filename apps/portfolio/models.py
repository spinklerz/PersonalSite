"""
This file defines the database models
"""
import datetime
import csv
import os
from .common import db, Field, auth
from pydal.validators import *

def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()

db.define_table('species',
    Field('name', 'string', unique=True, notnull=True),
    format='%(name)s'
)

db.define_table('checklist',
    Field('event_id', 'string', unique=True),
    Field('latitude', 'double'),
    Field('longitude', 'double'),
    Field('observation_date', 'date'),
    Field('observation_time', 'time'),
    Field('observer_id', 'string'),
    Field('duration_minutes', 'integer')
)

db.define_table('sighting',
    Field('checklist_id', 'reference checklist'),
    Field('species_id', 'reference species'),
    Field('count', 'integer')
)

db.commit()

if db(db.species).isempty():
    species_file = os.path.join(os.path.dirname(__file__), 'sample_data/species.csv')
    with open(species_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            species_name = row[0].strip()
            if species_name:
                db.species.insert(name=species_name)
    db.commit()

if db(db.checklist).isempty():
    checklists_file = os.path.join(os.path.dirname(__file__), 'sample_data/checklists.csv')
    with open(checklists_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        idx_event_id = header.index("SAMPLING EVENT IDENTIFIER")
        idx_lat = header.index("LATITUDE")
        idx_lng = header.index("LONGITUDE")
        idx_obs_date = header.index("OBSERVATION DATE")
        idx_obs_time = header.index("TIME OBSERVATIONS STARTED")
        idx_obs_id = header.index("OBSERVER ID")
        idx_dur = header.index("DURATION MINUTES")

        for row in reader:
            event_id = row[idx_event_id].strip()
            lat = float(row[idx_lat]) if row[idx_lat] else None
            lng = float(row[idx_lng]) if row[idx_lng] else None

            obs_date_str = row[idx_obs_date].strip() if row[idx_obs_date] else None
            obs_time_str = row[idx_obs_time].strip() if row[idx_obs_time] else None
            obs_date = datetime.datetime.strptime(obs_date_str, "%Y-%m-%d").date() if obs_date_str else None
            obs_time = datetime.datetime.strptime(obs_time_str, "%H:%M:%S").time() if obs_time_str else None
            observer_id = row[idx_obs_id].strip() if row[idx_obs_id] else None

            dur_str = row[idx_dur].strip() if row[idx_dur] else None
            dur = int(float(dur_str)) if dur_str else None

            db.checklist.insert(
                event_id=event_id,
                latitude=lat,
                longitude=lng,
                observation_date=obs_date,
                observation_time=obs_time,
                observer_id=observer_id,
                duration_minutes=dur
            )
    db.commit()

if db(db.sighting).isempty():
    species_map = {r.name: r.id for r in db(db.species.id > 0).select()}
    checklist_map = {r.event_id: r.id for r in db(db.checklist.id > 0).select()}

    sightings_file = os.path.join(os.path.dirname(__file__), 'sample_data/sightings.csv')
    with open(sightings_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        idx_event_id = header.index("SAMPLING EVENT IDENTIFIER")
        idx_common_name = header.index("COMMON NAME")
        idx_count = header.index("OBSERVATION COUNT")

        for row in reader:
            event_id = row[idx_event_id].strip()
            common_name = row[idx_common_name].strip()
            count_str = row[idx_count].strip() if row[idx_count] else None

            if count_str is not None:
                try:
                    count = int(float(count_str))
                except ValueError:
                    count = None
            else:
                count = None

            checklist_id = checklist_map.get(event_id)
            species_id = species_map.get(common_name)

            if checklist_id and species_id:
                db.sighting.insert(
                    checklist_id=checklist_id,
                    species_id=species_id,
                    count=count
                )
    db.commit()
