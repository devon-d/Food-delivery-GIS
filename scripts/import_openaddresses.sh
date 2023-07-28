#!/bin/bash
psql -U postgres -d flytrex << EOF
  CREATE OR REPLACE FUNCTION safe_json(i text, fallback json)
  RETURNS json AS \$$
  BEGIN
    RETURN i::json;
    EXCEPTION
        WHEN others THEN
            RETURN fallback::json;
  END;
  \$$ LANGUAGE plpgsql IMMUTABLE RETURNS NULL ON NULL INPUT;
EOF

psql -U postgres -d flytrex << EOF
  CREATE OR REPLACE FUNCTION escaped_json(j text)
  RETURNS json AS \$$
  BEGIN
    RETURN replace(j, '\', '\\')::json;
  END;
  \$$ LANGUAGE plpgsql IMMUTABLE RETURNS NULL ON NULL INPUT;
EOF

for f in $1; do
	echo "$f";
	psql -U postgres -d flytrex << EOF
		BEGIN;

		-- let's create a temp table to bulk data into
		CREATE temporary table temp_json (values text) on commit drop;
		\copy temp_json from $f;


		-- insert each row from temp_json table into address table
		-- after transforming 'geometry' column to PostGIS spatial type
		INSERT into address ("location", "hash", "props")
			SELECT ST_AsText(ST_GeomFromGeoJSON(values::json->>'geometry')) as location,
	   		   	   values::json->'properties'->>'hash' as hash,
	   		   	   values::json->'properties' as props
			FROM (select values from temp_json) a
			WHERE safe_json(values, '{}')::text != '{}' AND escaped_json(values)->'geometry'->>'type' = 'Point'
			ON CONFLICT DO NOTHING;

		COMMIT;
EOF
done

#-- Table: public.address
#
#-- DROP TABLE public.address;
#
#CREATE TABLE public.address
#(
#    id integer NOT NULL DEFAULT nextval('address_id_seq'::regclass),
#    hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
#    location geometry(Point) NOT NULL,
#    props jsonb DEFAULT '{}'::jsonb,
#    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
#    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
#    CONSTRAINT address_pkey PRIMARY KEY (id),
#    CONSTRAINT address_hash_key UNIQUE (hash)
#)
#
#TABLESPACE pg_default;
#
#ALTER TABLE public.address
#    OWNER to postgres;
