import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
} from "graphql";

export const ReactGQLEnumType = new GraphQLEnumType({
      name: "ReactEnum",
      values: {
        Like: { value: 1 },
        DisLike: { value: 0 },
      },
    })

export const postList = {
  page: { type: GraphQLInt },
  search: { type: GraphQLString },
  size: { type: GraphQLInt },
};

export const reactOnPost = {
  postId: { type: new GraphQLNonNull(GraphQLString) },
  react: {
    type: ReactGQLEnumType
  },
};
