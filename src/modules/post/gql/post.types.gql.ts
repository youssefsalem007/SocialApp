import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { OneUserType } from "../../user/gql/user.types.gql";
import { AvailabilityEnum } from "../../../common/enums";

export const AvailabilityGQLEnumType = new GraphQLEnumType({
  name: "AvailabilityGQLEnumType",
  values: {
    Public: { value: AvailabilityEnum.PUBLIC },
    Friends: { value: AvailabilityEnum.FRIENDS },
    Only_me: { value: AvailabilityEnum.ONLY_ME },
  },
});

export const OnePostType = new GraphQLObjectType({
  name: "OnePostType",
  fields: {
    _id: { type: new GraphQLNonNull(GraphQLID) },
    folderId: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: GraphQLString },
    attachments: { type: new GraphQLList(GraphQLString) },

    likes: { type: new GraphQLList(OneUserType) },
    tags: { type: new GraphQLList(OneUserType) },
    comments: { type: new GraphQLList(OneUserType) },

    createdBy: { type: new GraphQLNonNull(OneUserType) },
    updatedBy: { type: OneUserType },

    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    deletedAt: { type: GraphQLString },
    restoredAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    availability: { type: AvailabilityGQLEnumType },
  },
});

export const postList = new GraphQLObjectType({
  name: "PostListResponse",
  fields: {
    message: { type: new GraphQLNonNull(GraphQLString) },
    data: {
        type: new GraphQLObjectType({
      name: "PostPaginationResponse",
      fields: {
        docs: { type: new GraphQLList(OnePostType) },
        currentpage: { type: GraphQLInt },
        pages: { type: GraphQLInt },
        size: { type: GraphQLInt },
      },
    }),
    }
  },
});

export const  reactOnPost= new GraphQLObjectType({
      name: "ReactOnPostResponse",
      fields: {
    message: { type: new GraphQLNonNull(GraphQLString) },
      data: {type:OnePostType}
      },
    })
