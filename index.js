const util = {
  dynamodb: {
    toDynamoDB: function(value) {
      if (typeof (value) === "number") {
        return this.toNumber(value);
      } else if (typeof (value) === "string") {
        return this.toString(value);
      } else if (typeof (value) === "boolean") {
        return this.toBoolean(value);
      } else if (typeof (value) === "object") {
        if (value.length !== undefined) {
          return this.toList(value);
        } else {
          return this.toMap(value);
        }
      } else {
        throw new Error(`Not implemented for ${value}`);
      }
    },

    toString: function(value) {
      if (value === null) { return null; };

      return { S: value };
    },

    toStringSet: function(value) {
      if (value === null) { return null; };

      return { SS: value };
    },

    toNumber: function(value) {
      if (value === null) { return null; };

      return { N: value };
    },

    toNumberSet: function(value) {
      if (value === null) { return null; };

      return { NS: value };
    },

    toBinary: function(value) {
      if (value === null) { return null; };

      return { B: value };
    },

    toBinarySet: function(value) {
      if (value === null) { return null; };

      return { BS: value };
    },

    toBoolean: function(value) {
      if (value === null) { return null; };

      return { BOOL: value };
    },

    toNull: function() {
      return { NULL: null };
    },

    toList: function(values) {
      let out = [];
      for (const value of values) {
        out.push(this.toDynamoDB(value));
      }
      return { L: out }
    },

    toMap: function(mapping) {
      return { M: this.toMapValues(mapping) };
    },

    toMapValues: function(mapping) {
      let out = {};
      for (const [k, v] of Object.entries(mapping)) {
        out[k] = this.toDynamoDB(v);
      }
      return out;
    },

    toS3Object: function(key, bucket, region, version) {
      let payload;
      if (version === undefined) {
        payload = {
          s3: {
            key,
            bucket,
            region,
          }
        };
      } else {
        payload = {
          s3: {
            key,
            bucket,
            region,
            version,
          }
        };
      };
      return this.toString(JSON.stringify(payload));
    },

    fromS3ObjectJson: function(value) {
      throw new Error("not implemented");
    },
  },
};

module.exports = { util };
