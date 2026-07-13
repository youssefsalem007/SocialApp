import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../../common/enums";
import { HydratedDocument } from "mongoose";
import { IUser } from './../../../common/interfaces/user.interface';

export const GenderGQLEnumType = new GraphQLEnumType({
  name: "GenderGQLEnumType",
  values: {
    Male: { value: GenderEnum.MALE },
    Female: { value: GenderEnum.FEMALE },
  },
});

export const ProviderGQLEnumType = new GraphQLEnumType({
  name: "ProviderGQLEnumType",
  values: {
    System: { value: ProviderEnum.SYSTEM },
    Google: { value: ProviderEnum.GOOGLE },
  },
});

export const RoleGQLEnumType = new GraphQLEnumType({
  name: "RoleGQLEnumType",
  values: {
    User: { value: RoleEnum.USER },
    Admin: { value: RoleEnum.ADMIN },
  },
});

export const OneUserType: GraphQLObjectType = new GraphQLObjectType({
  name: "OneUserType",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    firstName: { type: new GraphQLNonNull(GraphQLString) },
    lastName: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: new GraphQLNonNull(GraphQLString) },
    userName: { type: GraphQLString,
      resolve: (parent: HydratedDocument<IUser>)=>{
        console.log({parent});
        return parent.gender === GenderEnum.MALE ? `Mr: ${parent.userName}` : `Mis: ${parent.userName}`
      }
     },
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: GraphQLString },

    phone: { type: GraphQLString },
    profilePicture: { type: GraphQLString },
    profileCoverPicture: { type: new GraphQLList(GraphQLString) },

    gender: { type: GenderGQLEnumType },
    role: { type: RoleGQLEnumType },
    provider: { type: ProviderGQLEnumType },

    changeCredentialsTime: { type: GraphQLString },
    DOB: { type: GraphQLString },
    confirmEmail: { type: GraphQLString },

    friends: { type: new GraphQLList(OneUserType) },

    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: GraphQLString },
    deletedAt: { type: GraphQLString },
    restoredAt: { type: GraphQLString },
  }),
});

export const profile = new GraphQLNonNull(
  new GraphQLObjectType({
    name: "ProfileResponse",
    description: "",
    fields: {
      message: { type: new GraphQLNonNull(GraphQLString) },
      data: {
        type: OneUserType,
      },
    },
  }),
);
