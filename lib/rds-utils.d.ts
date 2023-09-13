export type RdsUtil = {
    /**
      * Returns a object by transforming the stringified raw Amazon Relational Database Service
      * (Amazon RDS) Data API operation result format to a more concise object.
      * The returned object is a serialized list of SQL records of the result set.
      * Every record is represented as a collection of key-value pairs. The keys are
      * the corresponding column names.
  
      * If the corresponding statement in the input was a SQL query that causes a mutation
      * (for example INSERT, UPDATE, DELETE), then an empty list is returned.
      * For example, the query select * from Books limit 2 provides the raw result
      * from the Amazon RDS Data operation:
  
      * ```
      * {
      *   "sqlStatementResults": [
      *     {
      *       "numberOfRecordsUpdated": 0,
      *       "records": [
      *         [
      *           {
      *             "stringValue": "Mark Twain"
      *           },
      *           {
      *             "stringValue": "Adventures of Huckleberry Finn"
      *           },
      *           {
      *             "stringValue": "978-1948132817"
      *           }
      *         ],
      *         [
      *           {
      *             "stringValue": "Jack London"
      *           },
      *           {
      *             "stringValue": "The Call of the Wild"
      *           },
      *           {
      *             "stringValue": "978-1948132275"
      *           }
      *         ]
      *       ],
      *       "columnMetadata": [
      *         {
      *           "isSigned": false,
      *           "isCurrency": false,
      *           "label": "author",
      *           "precision": 200,
      *           "typeName": "VARCHAR",
      *           "scale": 0,
      *           "isAutoIncrement": false,
      *           "isCaseSensitive": false,
      *           "schemaName": "",
      *           "tableName": "Books",
      *           "type": 12,
      *           "nullable": 0,
      *           "arrayBaseColumnType": 0,
      *           "name": "author"
      *         },
      *         {
      *           "isSigned": false,
      *           "isCurrency": false,
      *           "label": "title",
      *           "precision": 200,
      *           "typeName": "VARCHAR",
      *           "scale": 0,
      *           "isAutoIncrement": false,
      *           "isCaseSensitive": false,
      *           "schemaName": "",
      *           "tableName": "Books",
      *           "type": 12,
      *           "nullable": 0,
      *           "arrayBaseColumnType": 0,
      *           "name": "title"
      *         },
      *         {
      *           "isSigned": false,
      *           "isCurrency": false,
      *           "label": "ISBN-13",
      *           "precision": 15,
      *           "typeName": "VARCHAR",
      *           "scale": 0,
      *           "isAutoIncrement": false,
      *           "isCaseSensitive": false,
      *           "schemaName": "",
      *           "tableName": "Books",
      *           "type": 12,
      *           "nullable": 0,
      *           "arrayBaseColumnType": 0,
      *           "name": "ISBN-13"
      *         }
      *       ]
      *     }
      *   ]
      * }
      ```
  
      * The util.rds.toJson of this JSON block is:
  
      ```
      * [
      *   {
      *     "author": "Mark Twain",
      *     "title": "Adventures of Huckleberry Finn",
      *     "ISBN-13": "978-1948132817"
      *   },
      *   {
      *     "author": "Jack London",
      *     "title": "The Call of the Wild",
      *     "ISBN-13": "978-1948132275"
      *   }
      * ]
      *
      ```
     * @param serializedSQLResult - Serialized SQL result
     * @returns {Record<string, unknown> | null} - Object representing SQL results
     */
    toJsonObject(serializedSQLResult: string): Record<string, any> | null;
};
//# sourceMappingURL=rds-utils.d.ts.map