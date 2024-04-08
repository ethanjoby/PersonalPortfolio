import {
  mobile,
  backend,
  creator,
  web,
  javascript,
  typescript,
  html,
  css,
  reactjs,
  redux,
  tailwind,
  nodejs,
  mongodb,
  git,
  figma,
  docker,
  meta,
  starbucks,
  tesla,
  shopify,
  carrent,
  jobit,
  tripguide,
  threejs,
  icuro,
  LetsSolv,
  asdrp, 
  origins,
  LearnToBe,
  CAHSD, 
  usaco,
  colab,
  inspirit,
  drive,
  lingosage,
  Netlab,
  keepCalm,

} from "../assets";

export const navLinks = [
  {
    id: "about",
    title: "About",
  },
  {
    id: "work",
    title: "Work",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const services = [
  {
    title: "Machine Learning and Artificial Intelligence",
    icon: backend,
  },
  {
    title: "Software Development and Engineering",
    icon: mobile,
  },
  {
    title: "Web Development",
    icon: web,
  },
  {
    title: "Robotics and Embedded Systems",
    icon: creator,
  },
];

const technologies = [
  {
    name: "HTML 5",
    icon: html,
  },
  {
    name: "CSS 3",
    icon: css,
  },
  {
    name: "JavaScript",
    icon: javascript,
  },
  {
    name: "TypeScript",
    icon: typescript,
  },
  {
    name: "React JS",
    icon: reactjs,
  },
  {
    name: "Redux Toolkit",
    icon: redux,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "Three JS",
    icon: threejs,
  },
  {
    name: "git",
    icon: git,
  },
  {
    name: "figma",
    icon: figma,
  },
  {
    name: "docker",
    icon: docker,
  },
];

const experiences = [
  {
    title: "CEO",
    company_name: "LingoSage",
    icon: lingosage,
    iconBg: "#181818",
    date: "August 2023 - March 2024",
    points: [
      "Spearheaded the conceptualization and development of LingoSage during my tenure as a software engineer at a leading tech company, driven by a passion for democratizing access to knowledge and overcoming language barriers in education.",
      "Leveraged my expertise in AI and machine learning gained through years of experience in the tech industry to design and implement the innovative AI dubbing technology that powers LingoSage, enabling real-time translation of educational content into multiple languages.",
      "Collaborated with industry-leading APIs and technologies, such as Assembly AI, Google Translator, and Microsoft Azure TTS, to optimize functionality and enhance performance, leveraging my network and expertise to secure strategic partnerships and resources for LingoSage's development and growth.",
      "Fostered a culture of innovation, collaboration, and continuous improvement within the LingoSage team, driving forward our mission to revolutionize learning and empower individuals worldwide to pursue knowledge without boundaries.",
    ],
    link: "https://lingosage.vercel.app/"
  },
  {
    title: "Artificial Intelligence Intern",
    company_name: "ICURO",
    icon: icuro,
    iconBg: "#383E56",
    date: "May 2021 - June 2021",
    points: [
      "Contributed to the development of a showcased robot at the INTEL expo during my internship at ICURO that was tasked with",
      "Acquired proficiency in data collection tools like CVAT and Roboflow, facilitating efficient data labeling.",
      "Utilized the YOLO framework to create an object detection algorithm for the robot.",
      "Played a crucial role in collecting and refining large datasets, essential for building accurate machine learning models.",
    ],
    link:"https://www.intel.com/content/www/us/en/partner/showcase/offering/a5b3b000000krtFAAQ/mobile-robots-ai-edge-platform.html",
  },
  {
    title: "Engineering Intern",
    company_name: "Netlab-Dr.Low at Caltech",
    icon: Netlab,
    iconBg: "#2f2f30",
    date: "Just Started",
    points: [
      "Currently serving as the only high school intern at Netlab",
      "Working on various projects and am extremely excited to work on several projects under the guidance of Dr. Low",
      "Completed first project which was revamping the current website and making it more easily maintainable",
      "Going to work on electrical outage detection and emergency notification tool for Caltech facilities",
      "Extremely excited to continue to work on exciting projects and research in the future",
    ],link:"http://netlab.caltech.edu/",
  },
  {
    title: "Software Engineering Intern",
    company_name: "LetsSolv",
    icon: LetsSolv,
    iconBg: "white",
    date: "July 2023 - Sep 2023",
    points: [
      "Developed a sentiment analysis prototype that gauged sentiment from news portals, forums, and Twitter, storing results for dashboard reporting.",
      "Key contributor to user modules, admin functions, and sentiment exploration.",
      "Implemented machine learning models (Vader Lexicon, scikit-Learn, TensorFlow) for enhanced analytical capabilities.",
      "Applied Python, Django, and MySQL skills for a robust sentiment analysis system.",
    ],link:"https://letssolv.com/",
  },
  {
    title: "Student Researcher",
    company_name: "ASDRP",
    icon: asdrp,
    iconBg: "white",
    date: "Jan 2022 - Present",
    points: [
      "Two-year ASDRP tenure focused on drug development and pharmacokinetics.",
      "Presented innovative findings at SCURR(Southern California Conferences for Undergraduate Research).",
      "Led project involving phosphorus atom extraction from DNA using PyMOL and Python.",
      "Methodology included data extraction from RCSB PDB and MMDB, yielding a dataset of 3,146 molecules.",
      "Developed a structural classification method for DNA Binding Enzymes in Homo sapiens.",
      "Emphasized DNA strand's geometric aspects, revealing common attributes across protein classes.",
      "Implemented methodologies to map specific features for protein family identification.",
      "Research holds promise in biomedical applications, particularly in drug development."
    ],link:"https://sites.google.com/asdrp.org/downing/ml-dd",
  },
 {
    title: "CTO",
    company_name: "Origins Customs",
    icon: origins,
    iconBg: "#ffffff",
    date: "April 2023 - Present",
    points: [
      "Current CTO at Origins Customs, overseeing technology for a thriving clothing business.",
      "Receiving 10+ orders per year each of which brings in nearly $1,000 in profits",
      "Manages technological infrastructure and operations, ensuring the seamless functioning of the business website.",
      "Created clean custom clothing website which can take in custom orders and sends emails to notify the faculty as well as the customer thanking them for their order.",
      "The faculty are also prompted to check out clean custom admin panel with all orders that have been taken",
      "Utilized Vite/React, typescript, tailwindCSS, Firebase, and emailJS",
    ],link:"https://originscustoms.com/",
  },{
    title: "CTO and Director of Education",
    company_name: "California HS Democrats Chapter",
    icon: CAHSD,
    iconBg: "white",
    date: "March 2023 - Present",
    points: [
      "Currently serving as Chief of Technology, responsible for overseeing and implementing technological solutions.",
      "Simultaneously hold the position of Director of Education, leading a Discord channel focused on educating youth.",
      "The Discord channel aims to inform young individuals about ways to voice their opinions and actively participate in civic matters.",
    ],link:"https://cahsdemocrats.netlify.app/",
  },/*{
    title: "Web Developer",
    company_name: "USACO",
    icon: usaco,
    iconBg: "white",
    date: "Jan 2024 - Feb 2024",
    points: [
      "Maintain and enhance USACO Guide and CPI websites, addressing bugs and implementing updates.",
      "Utilize React and adapt to technologies like Typescript, TailwindCSS, Gatsby, and Firebase.",
      "Contribute collaboratively through pull requests, actively participating in projects and issue resolution.",
    ],
  },*/
  {
    title: "Tutor",
    company_name: "Learn To Be",
    icon: LearnToBe,
    iconBg: "black",
    date: "Jan 2022 - Present",
    points: [
      "Created engaging learning environment by encouraging questions, sparking discussions.",
      "Planned curriculum based on individual academic needs.",
      "Met with parents to discuss youth progress and potential.",
      "Provided extra support for struggling students by tutoring in Math and Science."
    ],link:"https://www.learntobe.org/",
  }
];

const testimonials = [
  {
    testimonial:
      "I thought it was impossible to make a website as beautiful as our product, but Rick proved me wrong.",
    name: "Sara Lee",
    designation: "CFO",
    company: "Acme Co",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    testimonial:
      "I've never met a web developer who truly cares about their clients' success like Rick does.",
    name: "Chris Brown",
    designation: "COO",
    company: "DEF Corp",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    testimonial:
      "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
    name: "Lisa Wang",
    designation: "CTO",
    company: "456 Enterprises",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
  },
];

const projects = [
  {
    name: "KeepCalm",
    description: "KeepCalm is a supportive online platform dedicated to mental health discussions and support groups. Built using Django framework, KeepCalm features multiple chat rooms focused on various mental health disorders, including personality disorders, Alzheimer's, autism, eating disorders, and depression. Users can engage in conversations, share experiences, and access resources related to mental well-being within specialized chat rooms. With a robust authentication system, KeepCalm prioritizes user privacy and confidentiality, ensuring a safe and supportive environment for individuals seeking assistance and community support.",
    tags: [
      {
        name: "django",
        color: "green-text-gradient"
      },
      {
        name: "mental health",
        color: "blue-text-gradient"
      },
      {
        name: "support groups",
        color: "purple-text-gradient"
      }
    ],
    image: keepCalm,
    source_code_link: "https://drive.google.com/file/d/15L0OD94TkI6YrJWI7QUp0s6AGc_fTLmf/view?usp=sharing",
    topRight:drive,
  },
  {
    name: "Object Detection on Street",
    description:
      "I developed an object detection model using the YOLO framework and a CNN, achieving a 90% accuracy rate. I also experimented with expert models such as VGG16, VGG19, ResNet50, and DenseNet121, gaining valuable insights. The model can currently take in and output videos and will be integrated with a live video camera using TensorFlow.js for real-time applications. Its accuracy rate and ability to handle multiple objects make it useful for computer vision, robotics, and autonomous systems. The real-time integration will be interesting to compare with the expert models.",
    tags: [
      {
        name: "YOLO Framework",
        color: "blue-text-gradient",
      },
      {
        name: "TensorFlow.js",
        color: "green-text-gradient",
      },
      {
        name: "Convolutional Neural Network (CNN)",
        color: "pink-text-gradient",
      },
    ],
    image: jobit,
    source_code_link: "https://drive.google.com/file/d/1SsaQTGQ2mifC7w9Isj927ILIBbnZhfkI/view?usp=sharing",
    topRight: colab,
  },
  {
    name: "Video Game User Retention Personal Research Paper under mentorship of MIT Alumna Anjali Singh",
    description:
      "Embarking on a mission to elevate user retention in the dynamic landscape of the video game industry, my personal research paper, conducted under the mentorship of MIT Alumna Anjali Singh at INSPIRIT AI, represents a deep dive into the intersection of player engagement and game difficulty prediction. The primary objective of the research was to optimize player engagement by predicting the optimal game difficulty. This involved a meticulous analysis of player statistics alongside real-time camera footage. The findings of this comprehensive study were presented through a detailed research paper and an accompanying poster. To fuel the investigation, I leveraged Kaggle datasets encompassing facial emotion and real-time Call of Duty player data. The utilization of pre-trained convolutional neural networks, specifically VGG16 and VGG19, on image datasets added a sophisticated layer to the analysis, enabling a nuanced understanding of player dynamics. In the pursuit of precision, various machine learning models were employed, including K-Nearest Neighbors and Decision Trees, applied to the Kaggle Dataset focusing on Call of Duty (COD) players. This intricate amalgamation of models seamlessly integrated emotional cues derived from facial expressions with quantitative player data, presenting a holistic perspective on user engagement. In essence, this research paper represents a comprehensive exploration at the crossroads of player psychology, statistical analysis, and machine learning methodologies, with the ultimate goal of enhancing the user retention strategies within the ever-evolving realm of video game dynamics.",
    tags: [
      {
        name: "CNN",
        color: "blue-text-gradient",
      },
      {
        name: "VGG16",
        color: "green-text-gradient",
      },
      {
        name: "k-nearest Neighbors",
        color: "pink-text-gradient",
      },
    ],
    image: tripguide,
    source_code_link: "https://independent-project-mentorship.netlify.app/projects/61b6744c6bb550e4068d693e1c0ab942d2751c91.html",
    topRight:inspirit,
  },
];

export { services, technologies, experiences, testimonials, projects };
