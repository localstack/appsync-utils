const util = {
  dynamodb: {
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
  },
};

module.exports = { util };
