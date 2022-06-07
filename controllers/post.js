const Post = require("../models/Post");
const User = require("../models/User");

exports.createPost = async (req, res) => {
  try {
    const newPostData = {
      caption: req.body.caption,
      image: {
        public_id: "req.body.public_id",
        url: "req.body.url",
      },
      owner: req.user._id,
    };

    const post = await Post.create(newPostData);

    //postu oluşturan kullanıcı bilgisi
    const user = await User.findById(req.user._id);
    /*user modelinin posts alanına eklenen postun idsini ekliyoruz kullan
        bu sayede userın postlarını elede edebiliyoruz.
        */
    user.posts.push(post._id);
    await user.save();

    res.status(201).json({
      success: true,
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //post owner alanındaki id user id ile eşleşmiyorsa yetkisiz erişim
    if (post.owner.toString() !== req.user._id.toString()) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    //postu sil
    await post.remove();

    //user modelden ilgili userı bul
    const user = await User.findById(req.user._id);
    //user modeldeki posts alanındaki idnin konumunu al
    const index = user.posts.indexOf(req.params.id);
    //o indexdeki değeri sil
    user.posts.splice(index, 1);

    await user.save();

    res.status(200).json({
      success: true,
      message: "post deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//post beğen ve geri al
exports.likeAndUnlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //post beğenmeme unlike işlemi
    if (post.likes.includes(req.user._id)) {
      //user modeldeki posts alanındaki idnin konumunu al
      const index = post.likes.indexOf(req.user._id);
      //ilgili yeri sil
      post.likes.splice(index, 1);

      await post.save();

      return res.status(200).json({
        success: true,
        message: "Post Unliked",
      });
    } else {
      //post beğenilmediyse likes alanına idyi push ederek postu kullanıcının beğenmesini sağlar
      post.likes.push(req.user._id);
      await post.save();

      return res.status(200).json({
        success: true,
        message: "Post Liked",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//takip edilen kullanıcının postlarını alma
exports.getPostOfFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    /* 
      giriş yapan kullanıcının takipçilerinin following idsini postların owner alanında arayarak
      takip edilen kullanıcı postlarını getiriyor.
      owner sütunu postu ekleyen kişinin idsini tutuyor.
      */
    const posts = await Post.find({
      owner: {
        $in: user.following,
      },
    }).populate("owner likes comments.user");

    res.status(200).json({
      success: true,
      posts: posts.reverse()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCaption = async (req, res) => {
  try {

    const post = await Post.findById(req.params.id)

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //isteği yapan kullanıcı postu ekleyen kullanıcı mı kontrolü
    if (post.owner.toString() !== req.user._id.toString()) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    post.caption = req.body.caption
    await post.save()

    res.status(200).json({
      success: true,
      message: "Post updated",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.commentOnPost = async(req,res) => {
  try {

    const post = await Post.findById(req.params.id)

    if(!post){
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //başlangıçta posta yorum yapılmamış
    let commentIndex = -1;

    //postun commentlerini dön içerisinde user id değeri eşleşiyorsa kullanıcı yorum yapmıştır
    post.comments.forEach((item, index) => {
      if(item.user.toString() === req.user._id.toString()){
        commentIndex=index
      }
    })

    //comment yapılmış ise
    if(commentIndex !== -1){
      //istekten gelen commenti al ve comment alanına kaydet yani yorumu güncelle
      post.comments[commentIndex].comment = req.body.comment
      await post.save()

      return res.status(200).json({
        success: true,
        message: "Comment updated"
      })

    } else{
      //post modelinin comments arrayine objelerimizi push ediyoruz
      post.comments.push({
        user: req.user._id,
        comment: req.body.comment,
      })

      await post.save()
      return res.status(200).json({
        success: true,
        message: "Comment added"
      })
    }
    
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

exports.deleteComment = async(req, res) => {
  try {

    const post = await Post.findById(req.params.id)

    if(!post){
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //postu silecek kişi postun sahibi mi
    if(post.owner.toString() === req.user._id.toString()) {

      if(req.body.commentId==undefined){
        return res.status(400).json({
          success: false,
          message: "Comment ID is required"
        })
      }

      //requestde commentId göndererek seçilen commentin silinmesi sağlanır
      post.comments.forEach((item, index) => {
        if(item._id.toString() === req.body.commentId.toString()){
          post.comments.splice(index, 1)
        }
      })

      await post.save()

      return res.status(200).json({
        success: true,
        message: "Selected Comment has deleted"
      })

    } else{
      //kullanıcının yaptığı comment direkt silinir
      post.comments.forEach((item, index) => {
        if(item.user.toString() === req.user._id.toString()){
          post.comments.splice(index, 1)
        }
      })

      await post.save()

      return res.status(200).json({
        success: true,
        message: "Your Comment has deleted"
      })

    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}