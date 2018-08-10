LOAD DATA LOW_PRIORITY LOCAL INFILE 'export_dir/numeros_simple.csv'
REPLACE
INTO TABLE numeros_simple
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' ESCAPED BY '\"' LINES TERMINATED BY '\n'
IGNORE 1 LINES
(ID_Utilisateur, Publicationcode, Numero);

-- Cleanup issues belonging to users who don't monitor authors
DELETE from numeros_simple
where ID_Utilisateur not in (select a_p.ID_User FROM auteurs_pseudos_simple a_p);

ALTER TABLE numeros_simple ADD CONSTRAINT numeros_simple_auteurs_pseudos_simple_ID_User_fk FOREIGN KEY (ID_Utilisateur) REFERENCES auteurs_pseudos_simple (ID_User);

SHOW WARNINGS;
