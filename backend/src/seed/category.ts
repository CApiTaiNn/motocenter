import { connectToMongo } from '.'
import Category from '../models/Category'

const seedCategory = async () => {
  await connectToMongo()
  await Category.deleteMany({})

  await Category.insertMany([
    {
      name: 'Réparation',
      icon: 'i-lucide-wrench'
    },
    {
      name: 'Entretien',
      icon: 'i-lucide-cog'
    },
    {
      name: 'Course',
      icon: 'i-lucide-motorbike'
    },
    {
      name: 'Opinion',
      icon: 'i-lucide-megaphone'
    },
    {
      name: 'Modèle',
      icon: 'i-lucide-component'
    }
  ])

  console.log('Categories seeding')
}

export default seedCategory
