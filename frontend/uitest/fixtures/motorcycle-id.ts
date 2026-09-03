// Typed fixtures for the motorcycle detail page (app/pages/motorcycle/[id].vue).
// Types come from app/types/* so the mocked payloads stay in sync with the app.
import type { IMotorcycle, MotorcycleCategory } from '~/types/motorcycles'
import type { IBrand } from '~/types/brand'
import type { IMessage } from '~/types/messages'
import type { IUser, IUserPublic } from '~/types/users'

// The fixed id used in the URL (`/motorcycle/${MOTO_ID}`). The mocked
// motorcycle carries the same _id so the page's `filter={_id}` fetch resolves it.
export const MOTO_ID = '64b0000000000000000000bb'

// A discussion post id so `postComment` skips post-creation and the comment
// refetch hits a single known endpoint.
export const POST_ID = '64b0000000000000000000cc'

// A top-level comment id (drives posts/:id/responses + messages/:id/responses).
export const COMMENT_ID = '64b0000000000000000000dd'

export const brand: IBrand = {
  _id: '64b000000000000000000001',
  name: 'Yamaha',
  createAt: '2024-01-01T00:00:00.000Z',
  icon: 'https://cdn.example.test/yamaha.svg'
}

// The comment-like test locates the counter by exact text. The counts below
// (12345 / 12300) exceed every stat value, so the CountUp stat animation — which
// ticks 0 -> value and space-separates 4+ digit numbers ("9 999") — can never
// transiently render the same string as the plain comment counter ("12345").
const baseMotorcycle: Omit<IMotorcycle, 'post'> = {
  _id: MOTO_ID,
  brand,
  name: 'MT-09',
  year: 2021,
  // String literal (not the enum value) so this fixture needs no runtime `~` alias.
  category: 'roadster' as MotorcycleCategory,
  engine_size: 889,
  horsePower: 119,
  torque: 93,
  weight: 189,
  consumption: 5,
  soundLink: 'https://cdn.example.test/mt09.mp3',
  imageUrl: 'https://cdn.example.test/mt09.jpg',
  isAvailableA2: false,
  is_public: true,
  speedMax: 230,
  price: 9999,
  createdAt: '2024-01-01T00:00:00.000Z'
}

// No `post` -> fetchMessages() returns early, the comments block shows the empty
// state and no extra endpoints are hit. Used by the render/stats/audio/CTA tests.
export const motorcycle: IMotorcycle = { ...baseMotorcycle, post: '' }

// With a `post` id, the comment thread + comment-posting flow are reachable.
export const motorcycleWithPost: IMotorcycle = { ...baseMotorcycle, post: POST_ID }

// A motorcycle without a sound extract -> AudioPlayer is replaced by fallback text.
export const motorcycleNoSound: IMotorcycle = {
  ...baseMotorcycle,
  post: '',
  soundLink: undefined
}

// Shape returned by GET motorcycles/max-stats (see backend motorcycle.ts).
export const maxStats = {
  maxYear: 2030,
  maxEngineSize: 2000,
  maxHorsePower: 200,
  maxTorque: 200,
  maxWeight: 300,
  maxConsumption: 15,
  maxAcceleration: 15,
  maxSpeedMax: 320,
  maxPrice: 30000
}

export const loggedInUser: IUser = {
  _id: '64b000000000000000000abc',
  firstname: 'Jean',
  lastname: 'Moto',
  pseudo: 'jeanmoto',
  email: 'jean@example.test',
  isAdmin: false,
  password: '',
  image: 'https://cdn.example.test/jean.png',
  idMoto: MOTO_ID,
  userType: 'confirmed',
  ridingStartYear: 2015
}

const commentAuthor: IUserPublic = {
  _id: '64b000000000000000000def',
  pseudo: 'ridergirl',
  image: 'https://cdn.example.test/ridergirl.png'
}

// A single top-level comment on the motorcycle's discussion post.
export const comment: IMessage = {
  _id: COMMENT_ID,
  content: 'Super moto, tres joueuse en ville !',
  description: null,
  like: 12345,
  dislike: 12300,
  isRep: false,
  isPublicationResponse: true,
  parentId: null,
  user: commentAuthor,
  createdAt: '2024-06-01T10:00:00.000Z',
  likedByMe: false,
  dislikedByMe: false
}

// Shape returned by PATCH messages when the comment is liked.
export const likedComment: IMessage = {
  ...comment,
  like: 12346,
  likedByMe: true
}
