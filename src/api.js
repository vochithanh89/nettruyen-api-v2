const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 8080;

const baseUrl = 'https://nhattruyenin.com';

const getHtmlData = async (path) => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(baseUrl + path);

  const html = await page.evaluate(() => {
    let html = document.querySelector('html').innerHTML;
    return html;
  });
  await browser.close();
  return html;
};

/* CROS middleware */
app.use(function (req, res, next) {
  // Mọi domain
  // res.header('Access-Control-Allow-Origin', '*');

  res.header('Access-Control-Allow-Origin', 'https://cttruyen.netlify.app');

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', (req, res) => {
  const list = [
    {
      title: 'List truyện',
      path: '/list',
    },
    {
      title: 'Tìm truyện',
      path: '/search',
    },
    {
      title: 'Lọc truyện',
      path: '/filter',
    },
    {
      title: 'Thể loại',
      path: '/category',
    },
    {
      title: 'Thông tin truyện',
      path: '/details',
    },
    {
      title: 'Thông tin chapters',
      path: '/chapter',
    },
  ];
  res.status(200).json(list);
});

app.get('/filter', async (req, res) => {
  try {
    const html = await getHtmlData('/the-loai');
    $ = cheerio.load(html);
    const categories = [];
    $('.ModuleContent .module-title + .nav li').each((index, element) => {
      const categoryName = $(element).find('a').text();
      const categoryHref = $(element).find('a').attr('href');
      const categoryId = categoryHref.slice(categoryHref.lastIndexOf('/the-loai') + 10, categoryHref.length);

      categories.push({
        name: categoryName,
        id: categoryId ? categoryId : 'all',
      });
    });

    const status = [
      {
        name: 'Tất cả',
        id: '-1',
      },
      {
        name: 'Hoàn thành',
        id: '2',
      },
      {
        name: 'Đang tiến hành',
        id: '1',
      },
    ];
    const sort = [
      {
        name: 'Ngày cập nhật',
        id: '0',
      },
      {
        name: 'Truyện mới',
        id: '15',
      },
      {
        name: 'Top all',
        id: '10',
      },
      {
        name: 'Top tháng',
        id: '11',
      },
      {
        name: 'Top tuần',
        id: '12',
      },
      {
        name: 'Top ngày',
        id: '13',
      },
      {
        name: 'Số chapter',
        id: '30',
      },
    ];

    res.status(200).json([
      {
        title: 'Sắp xếp',
        id: 'sort',
        filtersValue: sort,
      },
      {
        title: 'Trạng thái',
        id: 'status',
        filtersValue: status,
      },
      {
        title: 'Thể loại',
        id: 'category',
        filtersValue: categories,
      },
    ]);
  } catch (error) {
    const { message, name } = error;
    res.status(400).json({
      message,
      name,
    });
  }
});

app.get('/category', async (req, res) => {
  try {
    const html = await getHtmlData('/the-loai');
    $ = cheerio.load(html);
    const categories = [];
    $('.ModuleContent .module-title + .nav li').each((index, element) => {
      const categoryName = $(element).find('a').text();
      const categoryHref = $(element).find('a').attr('href');
      const categoryId = categoryHref.slice(categoryHref.lastIndexOf('/the-loai') + 10, categoryHref.length);

      categories.push({
        name: categoryName,
        id: categoryId,
      });
    });

    res.status(200).json(categories);
  } catch (error) {
    const { message, name } = error;
    res.status(400).json({
      message,
      name,
    });
  }
});

app.get('/list', async (req, res) => {
  try {
    const { page = 1, status, sort, category = 'all' } = req.query;

    let path = category !== 'all' ? `/the-loai/${category}` : '/the-loai';

    let myParams = {
      status: status,
      sort: sort,
      page: page,
    };

    const html = await getHtmlData(path, {
      params: {
        ...myParams,
      },
    });
    $ = cheerio.load(html);
    const data = [];
    $('.ModuleContent .items .row .item').each((index, element) => {
      const mangaName = $(element).find('.jtip').text();
      const posterUrl = $(element).find('.image a img').attr('data-original');
      const newestChapterText = $(element).find('ul .chapter:nth-child(1) a').text();

      const newestChapterTime = $(element).find('ul .chapter:nth-child(1) i').text();

      const href = $(element).find('.image a').attr('href');
      const id = href.slice(href.lastIndexOf('/') + 1, href.length);

      const chapterHref = $(element).find('ul .chapter:nth-child(1) a').attr('href');
      const chapterId = chapterHref.slice(chapterHref.indexOf('truyen-tranh/') + 13, chapterHref.length);

      data.push({
        id: id,
        mangaName,
        posterUrl: posterUrl,
        newestChapter: {
          chapterName: newestChapterText,
          chapterId,
          updatedAt: newestChapterTime,
        },
      });
    });
    const lastPageHref = $('.pagination').find('li:last-child a').attr('href');
    let lastPageCount = lastPageHref ? lastPageHref.slice(lastPageHref.indexOf('page=') + 5, lastPageHref.length) : 1;
    const title = $('.Module-248 .ModuleContent .nav li.active a').text();

    lastPageCount = Number(lastPageCount);

    res.status(200).json({
      title,
      data: data,
      pagination: {
        currentPage: Number(page) > lastPageCount ? lastPageCount : Number(page),
        totalPage: lastPageCount,
      },
    });
  } catch (error) {
    const { message, name } = error;
    res.status(400).json({
      message,
      name,
    });
  }
});

app.get('/search', async (req, res) => {
  try {
    const { page = 1, q } = req.query;

    const html = await getHtmlData('/the-loai', {
      params: {
        keyword: q,
        page: page,
      },
    });
    $ = cheerio.load(html);
    const data = [];
    $('.ModuleContent .items .row .item').each((index, element) => {
      const mangaName = $(element).find('.jtip').text();
      const posterUrl = $(element).find('.image a img').attr('data-original');
      const newestChapterText = $(element).find('ul .chapter:nth-child(1) a').text();

      const newestChapterTime = $(element).find('ul .chapter:nth-child(1) i').text();

      const href = $(element).find('.image a').attr('href');
      const id = href.slice(href.lastIndexOf('/') + 1, href.length);

      const chapterHref = $(element).find('ul .chapter:nth-child(1) a').attr('href');
      const chapterId = chapterHref.slice(chapterHref.indexOf('truyen-tranh/') + 13, chapterHref.length);

      data.push({
        id: id,
        mangaName,
        posterUrl: posterUrl,
        newestChapter: {
          chapterName: newestChapterText,
          chapterId,
          updatedAt: newestChapterTime,
        },
      });
    });
    const lastPageHref = $('.pagination').find('li:last-child a').attr('href');
    let lastPageCount = lastPageHref ? lastPageHref.slice(lastPageHref.indexOf('page=') + 5, lastPageHref.length) : 1;
    lastPageCount = Number(lastPageCount);

    res.status(200).json({
      data: data,
      pagination: {
        currentPage: Number(page) > lastPageCount ? lastPageCount : Number(page),
        totalPage: lastPageCount,
      },
    });
  } catch (error) {
    const { message, name } = error;
    res.status(400).json({
      message,
      name,
    });
  }
});

app.get('/details/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const html = await getHtmlData(`/truyen-tranh/${id}`);
    $ = cheerio.load(html);
    const chapters = [];
    const categories = [];
    $('#nt_listchapter nav ul .row').each((index, element) => {
      const chapterName = $(element).find('.chapter a').text();
      const updatedAt = $(element).find('.no-wrap.small').text();
      const viewCount = $(element).find('.col-xs-3.text-center.small').text();
      const chapterHref = $(element).find('.chapter a').attr('href');
      const chapterId = chapterHref.slice(chapterHref.indexOf('truyen-tranh/') + 13, chapterHref.length);

      chapters.push({
        chapterName,
        chapterId,
        updatedAt,
        viewCount,
      });
    });

    $('.kind.row .col-xs-8 a').each((index, element) => {
      const categoryName = $(element).text();
      const categoryHref = $(element).attr('href');
      const categoryId = categoryHref.slice(categoryHref.lastIndexOf('/the-loai') + 10, categoryHref.length);

      categories.push({ categoryName, categoryId });
    });

    const mangaName = $('#item-detail .title-detail').text();
    const posterUrl = $('.col-xs-4.col-image img').attr('src');
    const updatedAtText = $('#item-detail time').text();
    const updatedAt = updatedAtText.slice(updatedAtText.indexOf(':') + 2, updatedAtText.length - 2);
    const authorName = $('.author.row .col-xs-8').text();
    const status = $('.status.row .col-xs-8').text();
    const ratingCount = $('[itemprop="ratingCount"]').text();
    const ratingValue = $('[itemprop="ratingValue"]').text();

    const description = $('.detail-content p').text();

    res.status(200).json({
      mangaName,
      id,
      description,
      posterUrl,
      chapters,
      categories,
      otherDetails: {
        authorName,
        status,
        ratingValue,
        ratingCount,
        ratingValue,
      },
      updatedAt,
    });
  } catch (error) {
    const { message, name } = error;
    res.status(400).json({
      message,
      name,
    });
  }
});

app.get('/chapter/*', async (req, res) => {
  try {
    const chapterId = req.params[0];

    const html = await getHtmlData(`/truyen-tranh/${chapterId}`);

    $ = cheerio.load(html);
    const chapterImages = [];

    $('.reading-detail .page-chapter').each((index, element) => {
      const title = $(element).find('img').attr('alt');
      const imgUrl = $(element).find('img').attr('data-original');

      chapterImages.push({
        title,
        imgUrl,
      });
    });

    const mangaName = $('.top .txt-primary a').text();
    const href = $('.top .txt-primary a').attr('href');
    const id = href.slice(href.lastIndexOf('/') + 1, href.length);
    const chapterNameText = $('.top .txt-primary span').text();
    const chapterName = chapterNameText.slice(2, chapterNameText.length);
    const updatedAtText = $('.top i').text();
    const updatedAt = updatedAtText.slice(updatedAtText.indexOf(':') + 2, updatedAtText.length - 2);

    res.status(200).json({
      mangaName,
      id,
      currentChapter: {
        chapterName,
        chapterId,
        updatedAt,
      },
      chapterImages,
    });
  } catch (error) {
    const { message, name } = error;
    res.status(400).json({
      message,
      name,
    });
  }
});

app.listen(port, console.log(`App listening at http://localhost:${port}`));
