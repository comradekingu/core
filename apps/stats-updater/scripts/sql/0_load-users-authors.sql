LOAD DATA LOW_PRIORITY LOCAL INFILE 'csv_results/dm-users-authors.csv'
IGNORE
INTO TABLE auteurs_pseudos_simple
CHARACTER SET utf8mb4
FIELDS TERMINATED BY '\t' OPTIONALLY ENCLOSED BY '\"' ESCAPED BY '\"' LINES TERMINATED BY '\n'
(ID_User, NomAuteurAbrege, Notation);

SHOW WARNINGS;
