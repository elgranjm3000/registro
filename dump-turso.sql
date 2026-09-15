PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE `hospitales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text DEFAULT 'hospital' NOT NULL,
	`ubicacion` text DEFAULT '' NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL
);
INSERT INTO hospitales VALUES (1,'HOSPITAL MILITAR TIPO IV UNIVERSITARIO "DR. CARLOS ARVELO"','hospital','CARACAS, D.C.',1,'2026-09-15T14:38:11.605Z');
INSERT INTO hospitales VALUES (2,'HOSPITAL MILITAR TIPO I "DR. VICENTE SALIAS"','hospital','CARACAS, D.C.',1,'2026-09-15T14:38:11.798Z');
INSERT INTO hospitales VALUES (3,'HOSPITAL MILITAR "CNEL. ELBANO PAREDES VIVAS"','hospital','MARACAY, EDO. ARAGUA',1,'2026-09-15T14:38:11.890Z');
INSERT INTO hospitales VALUES (4,'HOSPITAL MILITAR TIPO II "CAP. GUILLERMO HERNÁNDEZ JACOBSEN"','hospital','SAN CRISTÓBAL, EDO. TÁCHIRA',1,'2026-09-15T14:38:12.043Z');
INSERT INTO hospitales VALUES (5,'HOSPITAL MILITAR TIPO III "DR. JOSÉ ÁNGEL ÁLAMO"','hospital','BARQUISIMETO, EDO. LARA',1,'2026-09-15T14:38:12.329Z');
INSERT INTO hospitales VALUES (6,'HOSPITAL MILITAR TIPO I "DR. JOSÉ MARÍA VARGAS"','hospital','SAN JUAN DE LOS MORROS, EDO. GUÁRICO',1,'2026-09-15T14:38:12.568Z');
INSERT INTO hospitales VALUES (7,'HOSPITAL MILITAR TIPO I "CNEL. NELSON SAYAGO MORA"','hospital','LA ASUNCIÓN, EDO. NUEVA ESPARTA',1,'2026-09-15T14:38:12.709Z');
INSERT INTO hospitales VALUES (8,'HOSPITAL NAVAL TIPO I "DR. PEDRO MANUEL CHIRINOS"','hospital','PUNTO FIJO, EDO. FALCÓN',1,'2026-09-15T14:38:12.881Z');
INSERT INTO hospitales VALUES (9,'HOSPITAL MILITAR TIPO I "DR. MANUEL SIVERIO CASTILLO"','hospital','PUERTO ORDAZ, EDO. BOLÍVAR',1,'2026-09-15T14:38:12.985Z');
INSERT INTO hospitales VALUES (10,'HOSPITAL MILITAR TIPO I "TCNEL. DR. FRANCISCO VALBUENA"','hospital','MARACAIBO, EDO. ZULIA',1,'2026-09-15T14:38:13.090Z');
INSERT INTO hospitales VALUES (11,'HOSPITAL NAVAL TIPO I "DR. RAÚL PERDOMO HURTADO"','hospital','CATIA LA MAR, EDO. LA GUAIRA',1,'2026-09-15T14:38:13.194Z');
INSERT INTO hospitales VALUES (12,'HOSPITAL NAVAL TIPO I "DR. FRANCISCO ISNARDI"','hospital','PUERTO CABELLO, EDO. CARABOBO',1,'2026-09-15T14:38:13.297Z');
INSERT INTO hospitales VALUES (13,'AMBULATORIO MILITAR "AMAZONAS"','ambulatorio','PUERTO AYACUCHO, EDO. AMAZONAS',1,'2026-09-15T14:38:13.399Z');
INSERT INTO hospitales VALUES (14,'AMBULATORIO MILITAR "CONCEPCIÓN MARINO"','ambulatorio','CARÚPANO, EDO. SUCRE',1,'2026-09-15T14:38:13.503Z');
INSERT INTO hospitales VALUES (15,'N.M.A. "MY. LEONARDO GÓMEZ CALDERÓN"','otro','MÉRIDA, EDO. MÉRIDA',1,'2026-09-15T14:38:13.606Z');
INSERT INTO hospitales VALUES (16,'N.M.A. "GUASDUALITO"','otro','GUASDUALITO, EDO. APURE',1,'2026-09-15T14:38:13.709Z');
INSERT INTO hospitales VALUES (17,'CASA HOGAR DEL ADULTO MAYOR "AÑOS DORADOS CARABOBO"','otro','EDO. CARABOBO',1,'2026-09-15T14:38:13.845Z');
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`clave_hash` text NOT NULL,
	`nombre` text NOT NULL,
	`rol` text NOT NULL,
	`hospital_id` integer,
	`activo` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`hospital_id`) REFERENCES `hospitales`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO usuarios VALUES (1,'admin@digesalud.mil.ve','$2b$10$O.4CspvKOp37Kw9KU9LWNOcJlMku8UWZes1uqQTNLdKgWGnkalJ9C','Jefe Sala Situacional','admin',NULL,1);
INSERT INTO usuarios VALUES (19,'centro1@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO IV UNIVERSITARIO "DR. CARLOS ARVELO"','centro',1,1);
INSERT INTO usuarios VALUES (20,'centro2@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO I "DR. VICENTE SALIAS"','centro',2,1);
INSERT INTO usuarios VALUES (21,'centro3@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR "CNEL. ELBANO PAREDES VIVAS"','centro',3,1);
INSERT INTO usuarios VALUES (22,'centro4@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO II "CAP. GUILLERMO HERNÁNDEZ JACOBSEN"','centro',4,1);
INSERT INTO usuarios VALUES (23,'centro5@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO III "DR. JOSÉ ÁNGEL ÁLAMO"','centro',5,1);
INSERT INTO usuarios VALUES (24,'centro6@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO I "DR. JOSÉ MARÍA VARGAS"','centro',6,1);
INSERT INTO usuarios VALUES (25,'centro7@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO I "CNEL. NELSON SAYAGO MORA"','centro',7,1);
INSERT INTO usuarios VALUES (26,'centro8@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL NAVAL TIPO I "DR. PEDRO MANUEL CHIRINOS"','centro',8,1);
INSERT INTO usuarios VALUES (27,'centro9@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO I "DR. MANUEL SIVERIO CASTILLO"','centro',9,1);
INSERT INTO usuarios VALUES (28,'centro10@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL MILITAR TIPO I "TCNEL. DR. FRANCISCO VALBUENA"','centro',10,1);
INSERT INTO usuarios VALUES (29,'centro11@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL NAVAL TIPO I "DR. RAÚL PERDOMO HURTADO"','centro',11,1);
INSERT INTO usuarios VALUES (30,'centro12@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','HOSPITAL NAVAL TIPO I "DR. FRANCISCO ISNARDI"','centro',12,1);
INSERT INTO usuarios VALUES (31,'centro13@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','AMBULATORIO MILITAR "AMAZONAS"','centro',13,1);
INSERT INTO usuarios VALUES (32,'centro14@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','AMBULATORIO MILITAR "CONCEPCIÓN MARINO"','centro',14,1);
INSERT INTO usuarios VALUES (33,'centro15@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','N.M.A. "MY. LEONARDO GÓMEZ CALDERÓN"','centro',15,1);
INSERT INTO usuarios VALUES (34,'centro16@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','N.M.A. "GUASDUALITO"','centro',16,1);
INSERT INTO usuarios VALUES (35,'centro17@centro.mil.ve','$2b$10$DCDIzGmHtubvAzUpC8sA8ujUt37nH31Ml6xPaiLSptyzqpNjeXCou','CASA HOGAR DEL ADULTO MAYOR "AÑOS DORADOS CARABOBO"','centro',17,1);
CREATE TABLE `reportes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hospital_id` integer NOT NULL,
	`semana_desde` text NOT NULL,
	`semana_hasta` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`consultas_militar` integer DEFAULT 0 NOT NULL,
	`consultas_afiliado` integer DEFAULT 0 NOT NULL,
	`consultas_pna` integer DEFAULT 0 NOT NULL,
	`intervenciones_militar` integer DEFAULT 0 NOT NULL,
	`intervenciones_afiliado` integer DEFAULT 0 NOT NULL,
	`intervenciones_pna` integer DEFAULT 0 NOT NULL,
	`hospitalizaciones_militar` integer DEFAULT 0 NOT NULL,
	`hospitalizaciones_afiliado` integer DEFAULT 0 NOT NULL,
	`hospitalizaciones_pna` integer DEFAULT 0 NOT NULL,
	`observacion_centro` text DEFAULT '' NOT NULL,
	`observacion_admin` text DEFAULT '' NOT NULL,
	`verificado_en` text,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL,
	FOREIGN KEY (`hospital_id`) REFERENCES `hospitales`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO reportes VALUES (1,1,'2026-09-14','2026-09-18','verificado',4,3,3,0,3,0,0,4,0,'','','2026-09-15T15:32:23.441Z','2026-09-15T15:01:46.051Z','2026-09-15T15:32:23.441Z');
INSERT INTO reportes VALUES (2,13,'2026-09-14','2026-09-18','verificado',2,0,0,0,0,2,0,2,0,'','','2026-09-15T16:12:46.761Z','2026-09-15T16:11:59.277Z','2026-09-15T16:12:46.761Z');
INSERT INTO reportes VALUES (3,16,'2026-09-14','2026-09-18','verificado',0,0,0,0,0,0,0,1,0,'','','2026-09-15T16:12:47.727Z','2026-09-15T16:12:40.490Z','2026-09-15T16:12:47.727Z');
CREATE TABLE `pacientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hospital_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`cedula` text DEFAULT '' NOT NULL,
	`edad` integer,
	`sexo` text DEFAULT 'M' NOT NULL,
	`categoria` text NOT NULL,
	`actividad` text NOT NULL,
	`fecha` text NOT NULL,
	`creado_en` text NOT NULL,
	FOREIGN KEY (`hospital_id`) REFERENCES `hospitales`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO pacientes VALUES (1,1,'joseph muentes','9953047',38,'M','afiliado','consultas','2026-09-15','2026-09-15T15:45:39.192Z');
INSERT INTO pacientes VALUES (2,1,'Juan Pérez','V-12345678',34,'M','militar','consultas','2026-09-14','2026-09-15T15:53:25.524Z');
INSERT INTO pacientes VALUES (3,1,'María Rodríguez','V-87654321',28,'F','afiliado','hospitalizaciones','2026-09-15','2026-09-15T15:53:25.546Z');
INSERT INTO pacientes VALUES (4,1,'Luis Gómez','V-11223344',45,'M','pna','intervenciones','2026-09-16','2026-09-15T15:53:25.567Z');
INSERT INTO pacientes VALUES (5,1,'Juan Pérez','V-12345678',34,'M','militar','consultas','2026-09-14','2026-09-15T15:59:44.122Z');
INSERT INTO pacientes VALUES (6,1,'María Rodríguez','V-87654321',28,'F','afiliado','hospitalizaciones','2026-09-15','2026-09-15T15:59:44.131Z');
INSERT INTO pacientes VALUES (7,1,'Luis Gómez','V-11223344',45,'M','pna','intervenciones','2026-09-16','2026-09-15T15:59:44.136Z');
INSERT INTO pacientes VALUES (8,13,'Juan Pérez','V-12345678',34,'M','militar','consultas','2026-09-14','2026-09-15T16:11:58.802Z');
INSERT INTO pacientes VALUES (9,13,'María Rodríguez','V-87654321',28,'F','afiliado','hospitalizaciones','2026-09-15','2026-09-15T16:11:58.946Z');
INSERT INTO pacientes VALUES (10,13,'Luis Gómez','V-11223344',45,'M','pna','intervenciones','2026-09-16','2026-09-15T16:11:59.054Z');
INSERT INTO pacientes VALUES (11,13,'Juan Pérez','V-12345678',34,'M','militar','consultas','2026-09-14','2026-09-15T16:12:38.098Z');
INSERT INTO pacientes VALUES (12,13,'María Rodríguez','V-87654321',28,'F','afiliado','hospitalizaciones','2026-09-15','2026-09-15T16:12:39.515Z');
INSERT INTO pacientes VALUES (13,13,'Luis Gómez','V-11223344',45,'M','pna','intervenciones','2026-09-16','2026-09-15T16:12:39.750Z');
INSERT INTO pacientes VALUES (14,16,'Joseph','V-11223344',78,'M','afiliado','hospitalizaciones','2026-09-16','2026-09-15T16:12:39.979Z');
COMMIT;
