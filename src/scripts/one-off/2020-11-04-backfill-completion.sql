-- Design IDs from https://docs.google.com/spreadsheets/d/1ikfwL4M8bEICbZJL_zOUiOQZL6txulbqot8KFUmjG2Q/edit?ts=5f722c39#gid=38788163

with to_update as (select * from (values
  ('7da4f563-4bcc-40a4-b4eb-8f6f0111c507', '5/2/2019'),
  ('89e521aa-ae3c-478b-9fdc-8bc522e2de91', '5/2/2019'),
  ('0bddb59e-cb78-4abd-8986-f5c941e3d6ff', '5/3/2019'),
  ('8a3d3796-024d-4b21-9e92-610d8e05ba58', '5/28/2019'),
  ('52605023-64ae-4dcf-9371-8bb1ac1bfe0a', '6/19/2019'),
  ('46e70240-5eac-45e1-b941-35db1feaf90a', '6/19/2019'),
  ('713befa3-9321-41a2-a1d3-62841d3a0255', '6/19/2019'),
  ('0ca10434-6312-4cd5-aee5-73554e700ec9', '6/19/2019'),
  ('eab49846-cc9a-481b-b407-ccc750d5b1ca', '6/22/2019'),
  ('b801291a-1f89-4692-8b5d-41bd84811d57', '6/25/2019'),
  ('bd13cbc5-73b1-4333-adb5-d9db7e882551', '7/1/2019'),
  ('52fb04e3-b607-46f1-86bd-ec99e006ecc6', '7/1/2019'),
  ('0083f060-ceb8-4827-8474-7cfd148b877a', '7/2/2019'),
  ('5a28c453-7bca-41bd-8f5e-c5e9864f2eac', '7/2/2019'),
  ('0f13ec43-7611-4d8e-a765-b45fa550d906', '7/2/2019'),
  ('0f13ec43-7611-4d8e-a765-b45fa550d906', '7/2/2019'),
  ('c505411e-45a0-4029-ad9a-8196ddf45f23', '7/2/2019'),
  ('2549701b-c32d-468a-9fd7-0d064704362a', '7/2/2019'),
  ('c0fb40a4-98ce-45ef-9c51-e384868ca8f7', '7/2/2019'),
  ('79c0c198-707d-455b-a659-1062af2158fd', '7/2/2019'),
  ('501cac23-5c3d-4ae3-8e38-0bc92abda425', '7/2/2019'),
  ('d5c22a0e-596c-4d45-8dbf-60546e0c6402', '7/2/2019'),
  ('aff8377e-5ae7-480b-a289-d978c124b87e', '7/2/2019'),
  ('2b9d0796-7d38-4588-a8cf-3ffc5608e851', '7/2/2019'),
  ('635d382e-d9ca-421b-af2c-23d894599b0a', '7/2/2019'),
  ('c24950fb-0f26-4e29-89b0-2a5c2977db4d', '7/3/2019'),
  ('f7949ecc-817e-4a13-a1fb-a5f3dbf90ce7', '7/3/2019'),
  ('30a15f5d-eaf9-4d2f-8341-5d59132ca933', '7/3/2019'),
  ('f31b50f9-e16e-4369-af92-5d9e64a5cfc4', '7/3/2019'),
  ('7adeb3c1-5030-442d-a06b-c37084e45249', '7/3/2019'),
  ('637034eb-2cfb-48f2-8348-6d2ea2c7b4f5', '7/4/2019'),
  ('63b9f9b7-6df4-4321-ad57-865ffcd7f819', '7/4/2019'),
  ('15fb5962-05f8-47d2-8ee8-6f359c7d56ae', '7/4/2019'),
  ('28b15682-42cd-4533-88b4-b6a02487d217', '7/4/2019'),
  ('36c291b2-3813-429b-af80-3a77d9ca75fd', '7/4/2019'),
  ('b0d585b4-edb1-46cc-95ec-be1b69c66c1f', '7/4/2019'),
  ('b8915304-22c1-4cf8-b8a6-7941d7c2a327', '7/4/2019'),
  ('b2af3d98-8f1c-4f41-9342-64277152c21c', '7/4/2019'),
  ('b0d585b4-edb1-46cc-95ec-be1b69c66c1f', '7/4/2019'),
  ('72d2ea48-c0f7-4eb1-b6ce-11ce36f0e735', '7/5/2019'),
  ('0fcdc83a-9d91-4ccd-b604-241409f76e10', '7/5/2019'),
  ('f57fe3b2-03ab-4802-81bc-caf7622f9db5', '7/8/2019'),
  ('062a4d4e-cce8-465b-bd6b-a60aa43c1878', '7/8/2019'),
  ('79680ff3-2f9d-46a8-9638-1aa86cce3a36', '7/13/2019'),
  ('8ea6a42f-47ce-4b50-a40f-8d0ad5401e79', '7/13/2019'),
  ('35d191b6-b437-4227-be46-b8da1545342f', '7/15/2019'),
  ('1a4b72f9-e185-4732-9b17-cde5e03095ce', '7/15/2019'),
  ('f4705576-6d09-4672-b350-83632dfe762b', '7/16/2019'),
  ('7c02e883-ca0d-4298-9daa-e3b863fe73e7', '7/20/2019'),
  ('4fafa93c-e4cd-48fd-8b76-a5eb2703bf04', '7/21/2019'),
  ('07733a23-fd1d-40c9-af6c-c2004ee5278e', '7/23/2019'),
  ('26a08cc9-5e4c-4743-a77e-4ff4cba2caec', '7/23/2019'),
  ('2f0239cf-c2ee-48dc-a599-a416b023fde5', '7/23/2019'),
  ('38163ce4-0948-4b5d-8762-61b22f440b1b', '7/23/2019'),
  ('718f3d68-4d69-4f11-b235-77c54c495c20', '7/23/2019'),
  ('96c45321-f79a-4c8a-94c1-ed6a2bd315a6', '7/23/2019'),
  ('bd7f1025-773a-4f41-ab53-e22050b37bf9', '7/23/2019'),
  ('65b5a4da-6aeb-47d9-ba55-a5be549d9852', '7/26/2019'),
  ('11d5b6d9-cb98-45f5-8daf-e8fd4f7e28f7', '8/2/2019'),
  ('443aa51e-e808-4b26-9553-a1088146d946', '8/2/2019'),
  ('88c2c126-1667-474c-aef8-7d6bc48dea08', '8/2/2019'),
  ('db0c6e9c-bd15-492d-8033-25f2377966fd', '8/2/2019'),
  ('f4665f4d-3373-4f68-894a-969391685916', '8/2/2019'),
  ('0b9e0c2c-5fe4-483e-a66b-729a92510151', '8/2/2019'),
  ('48ff8cdc-8429-4721-9152-7d6e49f04de5', '8/2/2019'),
  ('578cabdc-4aaf-480c-8880-1e0363612778', '8/2/2019'),
  ('67a86fc4-ebcc-41c7-87b6-1503ae12f856', '8/2/2019'),
  ('ace21d2d-74a2-4a1a-a348-96ca323dacc9', '8/2/2019'),
  ('c34b7c9b-27fd-46cd-8667-0eaf13415be9', '8/2/2019'),
  ('74de6dbe-288a-4050-bfa5-3d39d3d905f1', '8/6/2019'),
  ('0b9e0c2c-5fe4-483e-a66b-729a92510151', '8/8/2019'),
  ('48ff8cdc-8429-4721-9152-7d6e49f04de5', '8/8/2019'),
  ('578cabdc-4aaf-480c-8880-1e0363612778', '8/8/2019'),
  ('592f3dcb-73e4-469c-be7a-d0c1b9795359', '8/8/2019'),
  ('67a86fc4-ebcc-41c7-87b6-1503ae12f856', '8/8/2019'),
  ('ace21d2d-74a2-4a1a-a348-96ca323dacc9', '8/8/2019'),
  ('c34b7c9b-27fd-46cd-8667-0eaf13415be9', '8/8/2019'),
  ('91c24fea-b636-4a5b-b312-f176cfb4cf8a', '8/13/2019'),
  ('b9f68090-a6fd-4081-b44b-635120e6c416', '8/16/2019'),
  ('ebd3aeff-9590-4379-80e6-f8421684e924', '8/16/2019'),
  ('e877e0b7-1668-47c4-a679-e6f01ed9bf85', '8/16/2019'),
  ('79b64a1e-875f-4dad-974e-db0dd1f13dbe', '8/16/2019'),
  ('fcac9218-4433-4d3a-93f5-ee0f6be86aa9', '8/20/2019'),
  ('231ba7df-f11c-45f3-97ba-e4ad9ca4f3e8', '8/21/2019'),
  ('7ff0d9a8-cec0-4809-842b-444b089abc20', '8/23/2019'),
  ('8b2ea6f7-3340-47f3-815e-47618901c431', '8/23/2019'),
  ('0848cbca-b113-4c57-97a6-e17fdb9a9b6b', '8/24/2019'),
  ('3227d571-7a3d-4f2c-b18e-60a255084c64', '8/24/2019'),
  ('dd984562-b7e3-4a70-b75a-2daf14d69cfe', '8/24/2019'),
  ('b6455aaf-97a8-4789-8d1c-aea8e5917892', '9/5/2019'),
  ('20fe9716-f72d-4ae3-af41-7c7d61cd18eb', '9/5/2019'),
  ('e337facd-e707-4ec1-b770-51c38a54a033', '9/5/2019'),
  ('09775de5-1599-42b8-94b7-95b010cd51d6', '9/7/2019'),
  ('4b9d1b56-ec82-486c-9a29-e887baf3e48b', '9/7/2019'),
  ('4e828dab-2d4a-4001-b992-168839680067', '9/7/2019'),
  ('6427664a-549f-4ccd-b09a-b366e159a528', '9/7/2019'),
  ('98003141-d191-450c-bd13-a6edeeefec01', '9/7/2019'),
  ('fe00feeb-e597-4f8f-8689-061f00067398', '9/12/2019'),
  ('2ad50223-3b82-444f-872a-4b2d074aa0ab', '9/27/2019'),
  ('f1fc70c8-4631-4377-bae5-97d0639a3a64', '9/27/2019'),
  ('19d9b874-763d-4296-8e72-9faba85546d7', '9/28/2019'),
  ('bceb0d88-f560-46b7-bb4b-a668a8f83ffb', '9/30/2019'),
  ('a5d51ae3-23b2-49d0-9192-2bb7bcd761f3', '10/9/2019'),
  ('6b719a53-f03f-4243-add4-98822468d40f', '10/12/2019'),
  ('b9558029-238e-4ed5-8cba-707b3137b2f6', '10/18/2019'),
  ('6700a8b3-136a-4c1a-abe6-83a36536460a', '10/22/2019'),
  ('6c3ce9ee-6457-49f8-881a-7875459d0973', '10/22/2019'),
  ('d55d7c5e-009b-48e5-909c-29ff9b092586', '10/22/2019'),
  ('d61840f7-4adb-4109-84e8-616e806d7382', '10/22/2019'),
  ('e847e82e-27a2-44c0-877b-fb33bdb85151', '10/22/2019'),
  ('ba548e11-6dd6-4882-829b-f6868726367e', '10/25/2019'),
  ('1b26c49c-d2c0-4f72-8b1f-4570b84f52aa', '11/6/2019'),
  ('bc0e06a7-38e1-4534-ab89-5d5ee28434d4', '11/6/2019'),
  ('dc0b4556-a6e4-44a5-8322-81f678103079', '11/6/2019'),
  ('d0ea58b4-17b1-457b-8a9b-6807545f1b9e', '11/8/2019'),
  ('58cdffa6-2a08-4112-9650-3939f627d7c0', '11/8/2019'),
  ('776a950c-39b9-405b-80b3-0bff1eb5461f', '11/9/2019'),
  ('a7b944f2-0b52-48a6-ba07-8086be6fba85', '12/13/2019'),
  ('0847f9d1-6d36-43a0-9e60-19098379c9b6', '12/14/2019'),
  ('52442208-5477-4e97-b9d1-59a8d87627b3', '12/14/2019'),
  ('09f4a7af-0fdf-4d4a-92c1-6518c65a8211', '12/19/2019'),
  ('794de58a-3dda-43f9-840a-e6f852300f6c', '12/25/2019'),
  ('1b8b1a2f-e7b1-4231-84bc-a028566c9716', '12/27/2019'),
  ('17ce9276-88b5-482b-8f13-c40f08c10912', '12/28/2019'),
  ('fb55b8b6-b050-41af-9ae1-ed0940aa1ba7', '12/31/2019'),
  ('60dab21b-0cbe-41df-b692-450aa3c4dcbc', '2/16/2020'),
  ('afed06d7-30fa-4d21-aa69-e477f370bf2d', '2/16/2020'),
  ('8ee2ce96-fa0b-4ad4-8ea1-3b7f17749bd4', '2/26/2020'),
  ('16aa4d28-153e-4f6a-b62b-2c147fa3d05e', '3/4/2020'),
  ('7183190e-2ba1-4861-8412-c0d7e1f7948f', '3/4/2020'),
  ('f6cfacef-ca0c-4ed7-8f2e-97e4e7f335a3', '3/9/2020'),
  ('318ebd6a-8315-418c-9122-52166b2f0a4f', '3/11/2020'),
  ('540109f4-6f97-4762-aa0f-bafe513242d9', '3/11/2020'),
  ('6191a5a1-c9de-40c5-951e-f53035370cff', '3/11/2020'),
  ('de91e345-0bfa-437d-b5d3-1264b4ae96ed', '3/13/2020'),
  ('cf519b71-a841-4be0-876a-8f4f3565597f', '3/13/2020'),
  ('1a7136f9-a8fd-4a09-9898-5f4642d91990', '3/22/2020'),
  ('b69cdea2-86a6-4df8-968e-8e78c154a910', '3/26/2020'),
  ('699cd493-73cb-4694-bf77-5a9f62cbcf92', '4/1/2020'),
  ('009f230e-faa0-46cf-b731-57ba1067e6a3', '4/15/2020'),
  ('73e46af3-8e10-49cf-b58f-d2f3292accb7', '4/21/2020'),
  ('77311d70-5903-4166-b1d5-188407e9159b', '4/21/2020'),
  ('8e8e5a0b-05ff-4811-95e4-186465b8547e', '4/21/2020'),
  ('c8a28d5f-d278-409b-adf4-4cbd149cbc52', '4/21/2020'),
  ('da588b40-54f2-4d6f-836c-0e1c287d5531', '4/21/2020'),
  ('2f4f758f-52a8-47d7-93e2-2d1a8afc9855', '5/5/2020'),
  ('3f1ca9b3-1ec6-4425-bb19-9015f8bcc1ea', '5/6/2020'),
  ('8d48a46f-5a6e-4a55-9a95-38dc935102f7', '5/9/2020'),
  ('0d30a636-d3d2-4526-a579-266c6c136862', '5/20/2020'),
  ('6d9e8602-0e9e-407d-8184-d3e347a27aae', '6/6/2020'),
  ('57bae6b3-e10f-4190-b8d3-c80dbd27e1e7', '6/15/2020'),
  ('a2870fca-32e7-4681-b602-e8f7403387f1', '6/15/2020'),
  ('4e133379-40fa-4a65-9118-1a5f35aa07df', '6/30/2020'),
  ('cc5efa8b-6fb2-4ce1-bc8c-d172b421e716', '6/30/2020'),
  ('ce523525-bde2-4c2d-adb0-ad6bba52ab9e', '6/30/2020'),
  ('55a657e0-176a-4265-a4a5-b5a9eda28fbb', '6/30/2020'),
  ('02663756-d615-4df2-a64a-96e482de17d6', '6/30/2020'),
  ('38f3acc8-a2b8-4e25-be20-91ec91e5fcbf', '6/30/2020'),
  ('5d46461d-5916-41c2-b647-27fc6944aa07', '6/30/2020'),
  ('1e47f90f-68f2-4676-9ddc-9d239218a356', '6/30/2020'),
  ('1e47f90f-68f2-4676-9ddc-9d239218a356', '6/30/2020'),
  ('051ebe21-800f-45fc-84d5-a012aae2c7c3', '6/30/2020'),
  ('d03a0a40-0aad-4a4c-925b-33ddb2a7cbf1', '6/30/2020'),
  ('23cfb1b6-8f79-4462-83ba-5f0f9203deae', '6/30/2020'),
  ('23cfb1b6-8f79-4462-83ba-5f0f9203deae', '6/30/2020'),
  ('85684e45-5b45-430e-8fcf-bf3afadc7b37', '6/30/2020'),
  ('f81203a9-2420-4770-9fed-1c5e2337b042', '6/30/2020'),
  ('ddea7a50-b970-496d-9b3e-462f53df7a6e', '6/30/2020'),
  ('8d1c1238-acb1-4771-bef8-20ff7039210a', '6/30/2020'),
  ('29003a11-d271-46bb-a07c-c6a2c6e45674', '6/30/2020'),
  ('335bebc3-d35c-432e-9e3c-6339cc6a88ae', '6/30/2020'),
  ('ed458f16-9211-4ee0-8ba1-bef0c8acb792', '6/30/2020'),
  ('3b22a5eb-6d65-48a6-9f49-a06510de4b1b', '6/30/2020'),
  ('cc45cd81-426a-41ff-9b8c-c73f8855dedb', '6/30/2020'),
  ('69d7a638-615a-42a4-a80c-7538424b5a93', '6/30/2020'),
  ('8be956d0-33db-457f-aabe-b80e481dce48', '6/30/2020'),
  ('237cc903-f9e7-4bff-bb74-60a0350ea74d', '6/30/2020'),
  ('a1c9f8f7-8986-4dfc-8ce5-3dbddee2acc7', '6/30/2020'),
  ('b8b20264-6106-4a08-b3da-b5101793af02', '6/30/2020'),
  ('4c6063fa-5ae6-4ea9-bfb6-89c9b6349e6a', '6/30/2020'),
  ('3e5b3c73-4aec-46c9-a02d-ef064a619299', '6/30/2020'),
  ('01d73716-9258-476b-9eef-9436335a2e97', '6/30/2020'),
  ('b09ade10-5d11-4722-8ef6-23cd08e16ec7', '6/30/2020'),
  ('35c19ca9-da66-4563-8adf-c8dc40542f40', '6/30/2020'),
  ('f7781a52-1283-4c50-8ae4-0dcc0b267061', '6/30/2020'),
  ('07441006-4bc5-41b6-9d96-ec0258635080', '6/30/2020'),
  ('4564cccd-0625-4557-ad8f-c67863749fd2', '6/30/2020'),
  ('72a34d08-ff2e-4136-98f7-bbecf88f018b', '6/30/2020'),
  ('5cc13125-1d5a-4c92-8ae7-6a90217bba78', '6/30/2020'),
  ('8cd277ba-f304-4239-ba73-04d164b74633', '6/30/2020'),
  ('a24a7fe5-2b73-46fb-9a23-41eedd0fa5c1', '6/30/2020'),
  ('eb4c2cc4-0e5f-49db-a772-7c73f3f1eaf2', '6/30/2020'),
  ('574b8900-10ff-4f4b-94ce-5869ab5241db', '6/30/2020'),
  ('79ba76b0-6fe3-426d-8f87-a60d085ce6d3', '6/30/2020'),
  ('b0a06dc4-7e2a-47f6-8cfe-55daf73fa8c1', '6/30/2020'),
  ('26e572f2-5119-40b2-a8c5-998b5a65119f', '6/30/2020'),
  ('0055bd98-09b9-4ddb-b6f8-fbbdb45d3ebc', '6/30/2020'),
  ('0cfbacd2-6091-4540-af96-0a3f3e998e28', '6/30/2020'),
  ('41b5df78-7745-416e-86c5-e5559b527c0f', '6/30/2020'),
  ('52e386ae-510f-4c54-99fc-e45b21855fed', '6/30/2020'),
  ('731f9ea4-d9cc-43ea-be8f-a9aa701d622c', '6/30/2020'),
  ('7becc283-e59b-47e6-af92-cd163bc1cd53', '6/30/2020'),
  ('153b8a59-1698-4823-8a77-c7098d9a4aa3', '6/30/2020'),
  ('3098c408-7958-4d85-afc2-146a000ba9ea', '6/30/2020'),
  ('67d6dff8-54a9-44cf-a888-ad761eab83b4', '6/30/2020'),
  ('8cc31678-ffd8-44c0-9464-ca44105a82f8', '6/30/2020'),
  ('90cdb84b-9e46-4416-8d3d-570538498ecf', '6/30/2020'),
  ('b3fe6a35-b31f-404c-8af0-bfed2edc4967', '6/30/2020'),
  ('c5fe4192-4dd5-45a6-9cf3-44e2fccf91d9', '6/30/2020'),
  ('d80b07bb-c3cd-4b33-bb5c-16dfbc7fb513', '6/30/2020'),
  ('b0e62d1e-b91c-4ce9-9c8a-8365accb30f9', '6/30/2020'),
  ('9b887279-eb7b-450c-b52b-b3278aa03e92', '6/30/2020'),
  ('aa336ecd-687e-42f4-9a66-8ad8432319cf', '6/30/2020'),
  ('c62e6c15-5921-4b3a-bcdf-da2b48d25a36', '6/30/2020'),
  ('ca138b69-c5b0-46ad-addf-85a917da0c84', '6/30/2020'),
  ('885b3251-3e4d-4827-a30d-ce6ac39fd77b', '6/30/2020'),
  ('d62b36d3-72c2-443b-aa6e-a726c5fd2913', '6/30/2020'),
  ('73fb8e41-dfd9-46af-bf6c-b7bc4b530f4b', '6/30/2020'),
  ('fdad3ea6-e067-4fbe-aa08-78438ed12b80', '6/30/2020'),
  ('1ff09611-a350-400f-b60a-a5bbdfd1a01e', '6/30/2020'),
  ('20ea430d-361e-41b2-b46e-c0ff359a76fe', '6/30/2020'),
  ('2aa9a71e-f815-40d0-ac16-ab3fc574ceea', '6/30/2020'),
  ('73fa106b-e580-4fdd-967b-a8d0e720e08e', '6/30/2020'),
  ('d72b2d7a-79ec-4007-bafc-255df5fbba75', '6/30/2020'),
  ('2fcc7024-900c-4ad1-8954-f113d66b77ac', '6/30/2020'),
  ('3b1c9f6b-1653-4f29-be9e-09bb2f0fdb92', '6/30/2020'),
  ('a2d24ced-54dc-4ecf-a68f-1ce278792e30', '6/30/2020'),
  ('dce34f1b-9ec4-463a-b0f8-624980d099cc', '6/30/2020'),
  ('fdc7a659-0455-4666-bfad-28d815a0a0f7', '6/30/2020'),
  ('6d3fb133-172d-453b-8886-2a8bd377bb50', '6/30/2020'),
  ('a150506a-4105-42ad-b112-73877a0979d8', '6/30/2020'),
  ('cfa5bf63-bb80-47f5-b56e-72f713eaa892', '6/30/2020'),
  ('e41c38bf-8d51-418d-85ff-2c5fdfb5a7d9', '6/30/2020'),
  ('8a88d91a-cbd9-47aa-8dcf-ee4c1dee9b8f', '6/30/2020'),
  ('00e9a26e-2bee-4725-87b2-d5407b27e394', '6/30/2020'),
  ('06d000bd-7be5-46b4-9e82-c7d9c8a9f74f', '6/30/2020'),
  ('86760b84-fcb9-4550-94a7-3fcbcbae4f42', '6/30/2020'),
  ('f34fb18e-1b74-40f3-9322-dd8b6ee6d44b', '6/30/2020'),
  ('0898ebd2-f25a-4b18-8a68-bfec45d2d9b5', '6/30/2020'),
  ('1e7b7724-1535-4a80-9e66-590203e60838', '6/30/2020'),
  ('9bfd302b-ee0c-4de9-83fa-922cd695dda5', '6/30/2020'),
  ('7336fe6a-de0f-4519-a33c-adf47d5b8f7a', '6/30/2020'),
  ('37083c17-9b0a-4182-b73c-c8b7e24f1080', '6/30/2020'),
  ('088f0ea0-f32b-497a-85ad-7c26c8a4a92a', '6/30/2020'),
  ('9e6c6435-c01f-4d11-bb22-91890b645e7d', '6/30/2020'),
  ('53afc1c2-d994-4a65-970a-eb788e885f1e', '6/30/2020'),
  ('c8871f26-eada-432c-afee-b25fe734a44a', '6/30/2020'),
  ('0435b726-8514-4a58-8468-5273aff4d4db', '6/30/2020'),
  ('1b8d060a-5230-4678-8734-47b0abdb46a0', '6/30/2020'),
  ('4a5d5eb5-b8c1-425b-8f35-948e91529abe', '6/30/2020'),
  ('9de95873-e419-4ee2-bc3e-8bf3023f522a', '6/30/2020'),
  ('b68e312b-705c-4682-9706-430986243e8a', '6/30/2020'),
  ('c048ab1b-be38-4e2e-aaaf-b3f7686f2479', '6/30/2020'),
  ('c3d4dd90-5b1c-454c-816d-c26a8dea13ad', '6/30/2020'),
  ('eb5112a3-1c5a-4d88-8e75-8555c7e8e121', '6/30/2020'),
  ('0e899ab1-b23c-478b-a0fa-c32911635259', '6/30/2020'),
  ('1609fdbc-302b-45c4-aa4d-8bf540db1528', '6/30/2020'),
  ('21096eaf-2c4c-4e33-8b06-e1d95775ffb4', '6/30/2020'),
  ('2314396f-fd18-44ba-b79a-4da042e52043', '6/30/2020'),
  ('31711120-0d45-4796-937d-6d5a0a393c0c', '6/30/2020'),
  ('3e6a72dc-51e6-4801-8bd0-3da409ed53e4', '6/30/2020'),
  ('681f2f89-466b-4d7c-8141-55136cb12fd1', '6/30/2020'),
  ('70597ec3-05ad-4a0f-bb02-d6148b5fa747', '6/30/2020'),
  ('72db036b-2149-4d2a-ad74-91670d53ef47', '6/30/2020'),
  ('aeb479ae-0b91-4b0b-b97e-c338e7014078', '6/30/2020'),
  ('bddf9aea-582f-48fc-a5fd-9cb8d7313675', '6/30/2020'),
  ('5343b847-0bf6-4b09-9f6d-584a98f06f83', '6/30/2020'),
  ('e9719997-697e-4d49-ace7-304622d88231', '6/30/2020'),
  ('f2f28bfa-3205-4e74-af23-56d3ac79c724', '6/30/2020'),
  ('af75330d-cbef-450c-9506-15e4396c6e16', '6/30/2020'),
  ('bb45e0f1-4412-49d5-b34e-7a70aa6206db', '6/30/2020'),
  ('757fa7cc-8f4f-47b5-acf3-39b4871b1ea0', '6/30/2020'),
  ('e568cae3-f37c-44ae-af5c-42604864d99f', '6/30/2020'),
  ('fa5062b9-2d3b-4a7b-b7b9-89d0aeed90e8', '6/30/2020'),
  ('678c9c37-ee60-40b7-90e1-f625b686dff8', '6/30/2020'),
  ('41df4c60-c6d6-45fd-afd4-b7689168690c', '6/30/2020'),
  ('4a4468f4-4fa3-4325-8921-7d9dff1da007', '6/30/2020'),
  ('59d215e5-a89d-4fe5-8a6d-4234732fb3aa', '6/30/2020'),
  ('d97e4e58-a151-4263-be0e-9412309246a7', '6/30/2020'),
  ('ff595446-87cb-4fe8-948a-cbaae8135a0b', '6/30/2020'),
  ('0b7c96fc-9d20-4b7d-9867-66fb21d88661', '6/30/2020'),
  ('48d79d6c-a759-42f7-bf16-7a5823833bfd', '6/30/2020'),
  ('3472e907-2016-43ef-ae67-1107ae16d05a', '6/30/2020'),
  ('4acef854-1480-4cd4-a045-130baf69a0c7', '6/30/2020'),
  ('86734e18-0d93-4ced-8e1d-507490ca2f3d', '6/30/2020'),
  ('93c3a9f9-8d0d-46e5-87d1-990eaf46a506', '6/30/2020'),
  ('cc104e91-3a53-4133-ada2-62fabad1f4f8', '6/30/2020'),
  ('d8642642-43b6-4cde-855f-3ea6839f9eb6', '6/30/2020')
) as t (design_id, completed_at))
update
  design_approval_steps as steps
set
  started_at = coalesce(steps.started_at, to_update.completed_at::timestamp),
  completed_at = to_update.completed_at::timestamp,
  state = 'COMPLETED',
  reason = null
from to_update
where steps.design_id = to_update.design_id::uuid
and steps.completed_at is null;