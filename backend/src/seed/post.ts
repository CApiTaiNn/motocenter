import { connectToMongo } from '.'
import Brand, { toBrandSnapshot } from '../models/Brand'
import Motorcycle from '../models/Motorcycle'
import Post from '../models/Post'
import User from '../models/User'
import { PostCategory } from '../constants/PostCategory'

const seedPost = async () => {
  await connectToMongo()
  await Post.deleteMany({})

  const user = await User.findOne({ firstname: 'Alice' })
  const motocenterUser = await User.findOne({ firstname: 'MotoCenter' })
  const brandHonda = await Brand.findOne({ name: 'Honda' })

  // Posts liés aux motos du comparo + mise à jour des motos
  const gsxr = await Motorcycle.findOne({ name: 'GSX-R600' })
  const cbr = await Motorcycle.findOne({ name: 'CBR1000RR-R Fireblade' })
  const mt07 = await Motorcycle.findOne({ name: 'MT-07' })

  if (
    !user ||
    !brandHonda ||
    !gsxr ||
    !cbr ||
    !mt07 ||
    !motocenterUser
  ) {
    throw new Error('Missing seeded data')
  }

  await Post.insertMany([
    {
      title: 'Quelle est la meilleure moto pour débuter ?',
      content:
        "Je cherche une bonne moto pour commencer, j'ai vu Malo, Loris, Sloan et Cyril. Ils m'ont donné envie.",
      category: PostCategory.REPAIR,
      user: user._id,
      brand: toBrandSnapshot(brandHonda),
      views: 12,
      image: '/images/posts/test1.png',
      userFavoritePost: []
    },
    {
      title: 'Quelle est la meilleure marque de moto ?',
      content:
        "Des personnes diront que c'est Suzuki ou Honda, mais vraiment c'est quoi la meilleure ?",
      category: PostCategory.MAINTENANCE,
      user: user._id,
      brand: toBrandSnapshot(brandHonda),
      image: '/images/posts/test2.png',
      userFavoritePost: []
    }
  ])

  if (gsxr) {
    const post = await new Post({
      title: 'GSX-R600',
      content: 'GSX-R600',
      category: PostCategory.MODEL,
      brand: gsxr.brand,
      user: motocenterUser._id
    }).save()
    await Motorcycle.findByIdAndUpdate(gsxr._id, { post: post._id })
  }

  if (cbr) {
    const post = await new Post({
      title: 'CBR1000RR-R Fireblade',
      content: 'CBR1000RR-R Fireblade',
      category: PostCategory.MODEL,
      brand: cbr.brand,
      user: motocenterUser._id
    }).save()
    await Motorcycle.findByIdAndUpdate(cbr._id, { post: post._id })
  }

  if (mt07) {
    const post = await new Post({
      title: 'MT-07',
      content: 'MT-07',
      category: PostCategory.MODEL,
      brand: mt07.brand,
      user: motocenterUser._id
    }).save()
    await Motorcycle.findByIdAndUpdate(mt07._id, { post: post._id })
  }

  console.warn('Post seeding')
}

export default seedPost
