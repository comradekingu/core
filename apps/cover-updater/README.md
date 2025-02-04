# duck-cover-id

Store cover info from a COA database and process them through Pastec.

### Requirements

- Make the scripts executable first: `chmod -R +x scripts`
- An accessible COA database (see [schema](https://github.com/bperel/dm-server/blob/master/sql/schema-coa.sql))
- A running [pastec](https://github.com/Visu4link/pastec) instance : `docker run --restart always -d --name pastec bperel/pastec-ubuntu-1704-timestamps`

### Execution

The COA database and Pastec need to be accessible to make the importation and the processing of the covers work. In the following examples we suppose that both are on a Docker network named `dmserver_cover-id-network`.

When created, the container runs the following steps :

- Import the covers from a COA database and store them into a Covers database (takes a few minutes)
- Process the covers (takes ~ 0.1 second per cover).

```bash
docker run -it --rm \
           --network dmserver_cover-id-network \
           --env-file .env \
           bperel/duck-cover-id-updater \
           bash -c "bash -c /home/scripts/import-covers.sh && bash -c /home/scripts/process-covers.sh"
```
